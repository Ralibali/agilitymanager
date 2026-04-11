import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch from both agility and hoopers tables in parallel
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

    let notifiedCount = 0;
    const notifications: any[] = [];
    const interestIds: string[] = [];

    for (const interest of interests) {
      const agilityComp = agilityMap.get(interest.competition_id);
      const hoopersComp = hoopersMap.get(interest.competition_id);
      let message: string | null = null;

      if (agilityComp && agilityComp.last_registration_date) {
        const lastReg = agilityComp.last_registration_date;
        if (lastReg === fmt(in3Days)) {
          message = `⭐️ ${agilityComp.competition_name} i ${agilityComp.location} — anmälan stänger om 3 dagar!`;
        } else if (lastReg === fmt(in1Day)) {
          message = `⚠️ Sista chansen! ${agilityComp.competition_name} stänger imorgon!`;
        }
      }

      if (hoopersComp) {
        const regOpens = hoopersComp.registration_opens;
        const regCloses = hoopersComp.registration_closes;
        const name = hoopersComp.competition_name || "Hooperstävling";
        const loc = hoopersComp.location || "";

        // Notify when registration opens today
        if (regOpens === todayStr) {
          message = `🐕 Anmälan öppnar idag för ${name}${loc ? ` i ${loc}` : ""}!`;
        }
        // Notify day before registration opens
        else if (regOpens === fmt(in1Day)) {
          message = `🐕 Anmälan öppnar imorgon för ${name}${loc ? ` i ${loc}` : ""}!`;
        }
        // Also warn when registration closes soon
        else if (regCloses === fmt(in3Days)) {
          message = `⭐️ ${name}${loc ? ` i ${loc}` : ""} — anmälan stänger om 3 dagar!`;
        } else if (regCloses === fmt(in1Day)) {
          message = `⚠️ Sista chansen! ${name} — anmälan stänger imorgon!`;
        }
      }

      if (message) {
        notifications.push({
          user_id: interest.user_id,
          competition_id: interest.competition_id,
          message,
        });
        interestIds.push(interest.id);
        notifiedCount++;
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);

      for (const id of interestIds) {
        await supabase
          .from("competition_interests")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", id);
      }
    }

    console.log(`Notified ${notifiedCount} users`);

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
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
