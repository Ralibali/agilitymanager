import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCronAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!(await hasCronAuth(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in1Day = new Date(today);
    in1Day.setDate(today.getDate() + 1);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const todayStr = fmt(today);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    // Get interests that need notification
    const { data: interests, error: fetchErr } = await supabase
      .from("competition_interests")
      .select("id, user_id, competition_id, notified_at")
      .eq("status", "interested")
      .or(`notified_at.is.null,notified_at.lt.${twoDaysAgo.toISOString()}`);

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      throw fetchErr;
    }

    if (!interests || interests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const compIds = [...new Set(interests.map((i: any) => i.competition_id))];

    const [agilityRes, hoopersRes] = await Promise.all([
      supabase
        .from("competitions")
        .select("id, competition_name, location, last_registration_date")
        .in("id", compIds),
      supabase
        .from("hoopers_competitions")
        .select("id, competition_name, location, registration_opens, registration_closes")
        .in("id", compIds),
    ]);

    const agilityMap = new Map((agilityRes.data || []).map((c: any) => [c.id, c]));
    const hoopersMap = new Map((hoopersRes.data || []).map((c: any) => [c.id, c]));

    interface Pending {
      interest: any;
      message: string;
      emailKind: "deadline_soon" | "last_chance" | "reg_opens";
      compName: string;
      compLocation: string;
      daysLeft: number;
    }

    const pending: Pending[] = [];

    for (const interest of interests) {
      const agilityComp = agilityMap.get(interest.competition_id);
      const hoopersComp = hoopersMap.get(interest.competition_id);
      let entry: Pending | null = null;

      if (agilityComp && agilityComp.last_registration_date) {
        const lastReg = agilityComp.last_registration_date;
        if (lastReg === fmt(in3Days)) {
          entry = { interest, message: `⭐️ ${agilityComp.competition_name} i ${agilityComp.location} — anmälan stänger om 3 dagar!`, emailKind: "deadline_soon", compName: agilityComp.competition_name, compLocation: agilityComp.location, daysLeft: 3 };
        } else if (lastReg === fmt(in1Day)) {
          entry = { interest, message: `⚠️ Sista chansen! ${agilityComp.competition_name} stänger imorgon!`, emailKind: "last_chance", compName: agilityComp.competition_name, compLocation: agilityComp.location, daysLeft: 1 };
        }
      }

      if (hoopersComp) {
        const regOpens = hoopersComp.registration_opens;
        const regCloses = hoopersComp.registration_closes;
        const name = hoopersComp.competition_name || "Hooperstävling";
        const loc = hoopersComp.location || "";

        if (regOpens === todayStr) {
          entry = { interest, message: `🐕 Anmälan öppnar idag för ${name}${loc ? ` i ${loc}` : ""}!`, emailKind: "reg_opens", compName: name, compLocation: loc, daysLeft: 0 };
        } else if (regOpens === fmt(in1Day)) {
          entry = { interest, message: `🐕 Anmälan öppnar imorgon för ${name}${loc ? ` i ${loc}` : ""}!`, emailKind: "reg_opens", compName: name, compLocation: loc, daysLeft: 1 };
        } else if (regCloses === fmt(in3Days)) {
          entry = { interest, message: `⭐️ ${name}${loc ? ` i ${loc}` : ""} — anmälan stänger om 3 dagar!`, emailKind: "deadline_soon", compName: name, compLocation: loc, daysLeft: 3 };
        } else if (regCloses === fmt(in1Day)) {
          entry = { interest, message: `⚠️ Sista chansen! ${name} — anmälan stänger imorgon!`, emailKind: "last_chance", compName: name, compLocation: loc, daysLeft: 1 };
        }
      }

      if (entry) pending.push(entry);
    }

    // (watchers-blocket längre ner körs oavsett om interests är tomma)

    let emailsSent = 0;
    if (pending.length > 0) {
      // 1) In-app notiser
      const notifications = pending.map((p) => ({
        user_id: p.interest.user_id,
        competition_id: p.interest.competition_id,
        message: p.message,
      }));
      await supabase.from("notifications").insert(notifications);

      // 2) E-postutskick — hämta användarens email + opt-out
      const userIds = [...new Set(pending.map((p) => p.interest.user_id))];
      const emailMap = new Map<string, string>();
      for (const uid of userIds) {
        const { data: u } = await supabase.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      }

      for (const p of pending) {
        const email = emailMap.get(p.interest.user_id);
        if (!email) continue;
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": serviceRoleKey,
            },
            body: JSON.stringify({
              templateName: "competition_reminder",
              recipientEmail: email,
              data: {
                eventName: p.compName,
                dateLabel: p.daysLeft === 0 ? "Idag" : p.daysLeft === 1 ? "Imorgon" : `Om ${p.daysLeft} dagar`,
                location: p.compLocation,
                daysBefore: p.daysLeft,
                signupUrl: "",
              },
            }),
          });
          if (resp.ok) emailsSent++;
          else console.error("send-email failed", await resp.text());
        } catch (e) {
          console.error("send-email error", e);
        }
      }

      // 3) Markera som notifierade
      await supabase
        .from("competition_interests")
        .update({ notified_at: new Date().toISOString() })
        .in("id", pending.map((p) => p.interest.id));

      console.log(`Notified ${pending.length} users (${emailsSent} emails)`);
    }


    // 4) Publik e-postbevakning (competition_watchers) — påminn confirmed
    //    watchers vars tävling har deadline inom 3 dagar.
    let watcherEmails = 0;
    try {
      const { data: watchers } = await supabase
        .from("competition_watchers")
        .select("id, email, competition_id, sport, token")
        .not("confirmed_at", "is", null)
        .is("deadline_notified_at", null);

      if (watchers && watchers.length > 0) {
        const watcherAgilityIds = [
          ...new Set(watchers.filter((w: any) => w.sport === "agility").map((w: any) => w.competition_id)),
        ];
        const watcherHoopersIds = [
          ...new Set(watchers.filter((w: any) => w.sport === "hoopers").map((w: any) => w.competition_id)),
        ];

        const [wAgility, wHoopers] = await Promise.all([
          watcherAgilityIds.length
            ? supabase
                .from("competitions")
                .select("id, competition_name, location, last_registration_date")
                .in("id", watcherAgilityIds)
            : Promise.resolve({ data: [] as any[] }),
          watcherHoopersIds.length
            ? supabase
                .from("hoopers_competitions")
                .select("competition_id, competition_name, location, registration_closes")
                .in("competition_id", watcherHoopersIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const wAgilityMap = new Map((wAgility.data || []).map((c: any) => [c.id, c]));
        const wHoopersMap = new Map((wHoopers.data || []).map((c: any) => [c.competition_id, c]));

        const notifiedIds: string[] = [];
        for (const w of watchers as any[]) {
          let compName = "";
          let compLoc = "";
          let closes: string | null = null;
          if (w.sport === "agility") {
            const c: any = wAgilityMap.get(w.competition_id);
            if (!c) continue;
            compName = c.competition_name || "Tävling";
            compLoc = c.location || "";
            closes = c.last_registration_date;
          } else {
            const c: any = wHoopersMap.get(w.competition_id);
            if (!c) continue;
            compName = c.competition_name || "Hooperstävling";
            compLoc = c.location || "";
            closes = c.registration_closes;
          }
          if (!closes) continue;
          if (closes !== fmt(in3Days) && closes !== fmt(in1Day)) continue;

          const daysLeft = closes === fmt(in1Day) ? 1 : 3;
          const dateLabel = daysLeft === 1 ? "imorgon" : `om ${daysLeft} dagar`;
          const viewUrl =
            w.sport === "hoopers"
              ? `https://agilitymanager.se/tavlingar/hoopers/${encodeURIComponent(w.competition_id)}`
              : `https://agilitymanager.se/tavlingar/${encodeURIComponent(w.competition_id)}`;
          const unsubUrl = `${supabaseUrl}/functions/v1/watch-competition/unsubscribe?token=${w.token}`;

          try {
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret": serviceRoleKey,
              },
              body: JSON.stringify({
                templateName: "watch_deadline",
                recipientEmail: w.email,
                data: {
                  competitionName: compName,
                  location: compLoc,
                  dateLabel,
                  viewUrl,
                  unsubUrl,
                },
              }),
            });
            if (resp.ok) {
              watcherEmails++;
              notifiedIds.push(w.id);
            } else {
              console.error("watcher send-email failed", resp.status, await resp.text());
            }
          } catch (e) {
            console.error("watcher send-email error", e);
          }
        }

        if (notifiedIds.length > 0) {
          await supabase
            .from("competition_watchers")
            .update({ deadline_notified_at: new Date().toISOString() })
            .in("id", notifiedIds);
        }
      }
    } catch (e) {
      console.error("watcher block error", e);
    }

    console.log(`Watchers notified: ${watcherEmails}`);

    return new Response(
      JSON.stringify({ success: true, notified: pending.length, emailsSent, watcherEmails }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
