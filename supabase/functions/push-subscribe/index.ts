import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return json({ vapidPublicKey: VAPID_PUBLIC_KEY });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "subscribe";
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";

  if (!endpoint || !endpoint.startsWith("https://") || endpoint.length > 1000) {
    return json({ error: "Ogiltig endpoint" }, 400);
  }

  if (action === "unsubscribe") {
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  const rawKeys = Array.isArray(body.competitionKeys) ? body.competitionKeys : [];
  const competitionKeys = rawKeys
    .filter((k): k is string => typeof k === "string" && /^[ah]-[\w-]{1,64}$/.test(k))
    .slice(0, 200);

  if (action === "sync") {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ competition_keys: competitionKeys })
      .eq("endpoint", endpoint);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, count: competitionKeys.length });
  }

  const p256dh = typeof body.p256dh === "string" ? body.p256dh : "";
  const auth = typeof body.auth === "string" ? body.auth : "";
  if (!p256dh || !auth) return json({ error: "Saknar nycklar" }, 400);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth,
      competition_keys: competitionKeys,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, count: competitionKeys.length });
});
