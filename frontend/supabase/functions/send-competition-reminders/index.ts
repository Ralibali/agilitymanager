// Daglig cron: hittar påminnelser där dagar-kvar matchar och skickar mejl
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function formatSwedishDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(targetIso: string, todayIso: string): number {
  const a = new Date(targetIso + "T00:00:00").getTime();
  const b = new Date(todayIso + "T00:00:00").getTime();
  return Math.round((a - b) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const todayIso = new Date().toISOString().slice(0, 10);

    // Hämta alla obeskickade påminnelser med tillhörande planerad tävling
    const { data: reminders, error } = await supabase
      .from("competition_reminders")
      .select(`
        id, user_id, days_before, channel, sent_at,
        planned_competitions!inner ( id, event_name, date, location, signup_url, dog_id )
      `)
      .is("sent_at", null)
      .eq("channel", "email");

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtrera de där datumet idag matchar (date - days_before === today)
    const due = reminders.filter((r: any) => {
      const planned = r.planned_competitions;
      if (!planned?.date) return false;
      const days = daysBetween(planned.date, todayIso);
      return days === r.days_before;
    });

    if (due.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, checked: reminders.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hämta användardata + hund för dessa
    const userIds = [...new Set(due.map((r: any) => r.user_id))];
    const dogIds = [...new Set(due.map((r: any) => r.planned_competitions.dog_id).filter(Boolean))];

    const [{ data: profiles }, { data: dogs }] = await Promise.all([
      supabase.from("profiles").select("user_id, handler_first_name, display_name").in("user_id", userIds),
      dogIds.length ? supabase.from("dogs").select("id, name").in("id", dogIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const dogMap = new Map((dogs ?? []).map((d: any) => [d.id, d]));

    // Hämta e-post via auth.users
    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    let sent = 0;
    const sentIds: string[] = [];
    const inappRows: any[] = [];

    for (const r of due as any[]) {
      const planned = r.planned_competitions;
      const email = emailMap.get(r.user_id);
      if (!email) continue;
      const profile = profileMap.get(r.user_id);
      const dog = planned.dog_id ? dogMap.get(planned.dog_id) : null;

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            templateName: "competition_reminder",
            recipientEmail: email,
            data: {
              handlerName: profile?.handler_first_name ?? profile?.display_name ?? "",
              eventName: planned.event_name,
              dogName: dog?.name ?? "",
              dateLabel: formatSwedishDate(planned.date),
              location: planned.location ?? "",
              signupUrl: planned.signup_url ?? "",
              daysBefore: r.days_before,
            },
          }),
        });
        if (!resp.ok) {
          console.error("send-email failed", await resp.text());
          continue;
        }
        sent++;
        sentIds.push(r.id);

        // Skapa även in-app notis
        inappRows.push({
          user_id: r.user_id,
          message: r.days_before === 0
            ? `🎯 Idag: ${planned.event_name}`
            : r.days_before === 1
            ? `⏰ Imorgon: ${planned.event_name}`
            : `📅 Om ${r.days_before} dagar: ${planned.event_name}`,
        });
      } catch (e) {
        console.error("reminder send error", e);
      }
    }

    if (sentIds.length) {
      await supabase
        .from("competition_reminders")
        .update({ sent_at: new Date().toISOString() })
        .in("id", sentIds);
    }
    if (inappRows.length) {
      await supabase.from("notifications").insert(inappRows);
    }

    return new Response(JSON.stringify({ success: true, sent, due: due.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-competition-reminders] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
