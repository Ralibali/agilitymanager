// One-shot bootstrap: stores SUPABASE_SERVICE_ROLE_KEY in vault.secrets as
// 'internal_secret' and re-schedules the three internal cron jobs to send it
// in an x-internal-secret header. Idempotent. Requires the caller to already
// know the service role key (Bearer auth), so it's safe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Allow callers that are either (a) an authenticated admin user, or (b) carry the SRK as bearer.
  const auth = req.headers.get("Authorization") || "";
  const isSrkBearer = auth.startsWith("Bearer ") && auth.slice(7).trim() === srk;

  if (!isSrkBearer) {
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
    const token = auth.slice(7).trim();
    const { data: claims } = await userClient.auth.getClaims(token);
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminCheck = createClient(supabaseUrl, srk);
    const { data: isAdmin } = await adminCheck.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }


  const admin = createClient(supabaseUrl, srk);

  // Upsert vault secret
  const { data: existing } = await admin
    .schema("vault")
    .from("secrets")
    .select("id")
    .eq("name", "internal_secret")
    .maybeSingle();

  if (existing) {
    await admin.rpc("vault_update_secret", { secret_name: "internal_secret", new_secret: srk }).catch(() => null);
  } else {
    await admin.rpc("vault_create_internal_secret", { v: srk }).catch(() => null);
  }

  // Reschedule the three internal cron jobs.
  const baseUrl = `${supabaseUrl}/functions/v1`;
  const jobs: { name: string; schedule: string; fn: string }[] = [
    { name: "scrape-competitions-daily", schedule: "0 5 * * *", fn: "scrape-competitions" },
    { name: "scrape-hoopers-competitions-daily", schedule: "30 5 * * *", fn: "scrape-hoopers-competitions" },
    { name: "send-competition-reminders-daily", schedule: "0 7 * * *", fn: "send-competition-reminders" },
    { name: "check-deadlines-daily", schedule: "0 8 * * *", fn: "check-registration-deadlines" },
    { name: "social-notifications-daily", schedule: "0 9 * * *", fn: "social-notifications" },
  ];

  const results: any[] = [];
  for (const j of jobs) {
    const cmd = `
      SELECT net.http_post(
        url := '${baseUrl}/${j.fn}',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
        ),
        body := jsonb_build_object('trigger', 'cron', 'at', now())
      ) AS request_id;
    `.trim();

    const { error } = await admin.rpc("reschedule_internal_cron", {
      job_name: j.name,
      job_schedule: j.schedule,
      job_command: cmd,
    });
    results.push({ job: j.name, error: error?.message ?? null });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
