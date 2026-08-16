import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SITE_URL = "https://www.agilitymanager.se";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@auroramedia.se",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);

interface Reminder {
  kind: string;
  title: string;
  body: string;
  url: string;
}

function daysUntil(dateStr: string, today: Date): number | null {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d.getTime() - t) / 86_400_000);
}

const CLOSING_DAYS = [7, 3, 1, 0];

function buildReminders(
  name: string,
  url: string,
  opens: string | null,
  closes: string | null,
  today: Date,
): Reminder[] {
  const out: Reminder[] = [];

  if (opens) {
    const d = daysUntil(opens, today);
    if (d === 0) {
      out.push({
        kind: "opens",
        title: "Anmälan är öppen!",
        body: `Anmälan till ${name} öppnar idag.`,
        url,
      });
    } else if (d === 1) {
      out.push({
        kind: "opens_tomorrow",
        title: "Anmälan öppnar imorgon",
        body: `${name} öppnar för anmälan imorgon.`,
        url,
      });
    }
  }

  if (closes) {
    const d = daysUntil(closes, today);
    if (d !== null && CLOSING_DAYS.includes(d) && d >= 0) {
      out.push({
        kind: `closing_${d}`,
        title: d === 0 ? "Sista anmälningsdagen!" : `Anmälan stänger om ${d} ${d === 1 ? "dag" : "dagar"}`,
        body:
          d === 0
            ? `Idag är sista dagen att anmäla till ${name}.`
            : `Glöm inte att anmäla till ${name}.`,
        url,
      });
    }
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const today = new Date();

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,competition_keys");

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allKeys = new Set<string>();
  (subs ?? []).forEach((s) => (s.competition_keys ?? []).forEach((k: string) => allKeys.add(k)));

  const agilityIds = [...allKeys].filter((k) => k.startsWith("a-")).map((k) => k.slice(2));
  const hoopersIds = [...allKeys].filter((k) => k.startsWith("h-")).map((k) => k.slice(2));

  const reminders = new Map<string, Reminder[]>();

  if (agilityIds.length) {
    const { data } = await supabase
      .from("competitions")
      .select("id,competition_name,club_name,last_registration_date")
      .in("id", agilityIds);
    (data ?? []).forEach((c) => {
      const name = (c.competition_name || c.club_name || "tävlingen").replace(/<[^>]*>/g, "").trim();
      reminders.set(
        `a-${c.id}`,
        buildReminders(name, `${SITE_URL}/tavlingar/${c.id}`, null, c.last_registration_date, today),
      );
    });
  }

  if (hoopersIds.length) {
    const { data } = await supabase
      .from("hoopers_competitions")
      .select("id,competition_name,club_name,registration_opens,registration_closes")
      .in("id", hoopersIds);
    (data ?? []).forEach((c) => {
      const name = (c.competition_name || c.club_name || "tävlingen").replace(/<[^>]*>/g, "").trim();
      reminders.set(
        `h-${c.id}`,
        buildReminders(
          name,
          `${SITE_URL}/tavlingar/hoopers/${c.id}`,
          c.registration_opens,
          c.registration_closes,
          today,
        ),
      );
    });
  }

  let sent = 0;
  let removed = 0;

  for (const sub of subs ?? []) {
    for (const key of sub.competition_keys ?? []) {
      for (const reminder of reminders.get(key) ?? []) {
        const { error: dupError } = await supabase.from("push_notifications_sent").insert({
          subscription_id: sub.id,
          competition_key: key,
          kind: reminder.kind,
        });
        if (dupError) continue; // redan skickad

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: reminder.title,
              body: reminder.body,
              url: reminder.url,
              tag: `${key}-${reminder.kind}`,
            }),
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            removed += 1;
          } else {
            console.error("push failed", status, String(err));
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, removed, subscriptions: subs?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
