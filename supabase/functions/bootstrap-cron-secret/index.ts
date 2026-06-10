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

  // Only callable with the service role key in Authorization (so only Lovable/admin can call it).
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.slice(7).trim() !== srk) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    { name: "check-deadlines-daily", schedule: "0 8 * * *", fn: "check-registration-deadlines" },
    { name: "send-competition-reminders-daily", schedule: "0 7 * * *", fn: "send-competition-reminders" },
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
