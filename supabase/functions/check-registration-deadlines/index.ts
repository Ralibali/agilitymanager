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

    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, checked: interests.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const unsubscribedSet = new Set<string>();

    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    // Hoppa över opt-outade
    if (emailMap.size > 0) {
      const { data: unsubs } = await supabase
        .from("email_unsubscribes")
        .select("email")
        .in("email", Array.from(emailMap.values()).map((e) => e.toLowerCase()));
      (unsubs ?? []).forEach((u: any) => unsubscribedSet.add(u.email.toLowerCase()));
    }

    let emailsSent = 0;
    for (const p of pending) {
      const email = emailMap.get(p.interest.user_id);
      if (!email) continue;
      if (unsubscribedSet.has(email.toLowerCase())) continue;

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

    return new Response(
      JSON.stringify({ success: true, notified: pending.length, emailsSent }),
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
