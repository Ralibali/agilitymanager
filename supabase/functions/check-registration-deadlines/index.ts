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

    // Get related competitions
    const compIds = [...new Set(interests.map((i: any) => i.competition_id))];
    const { data: comps } = await supabase
      .from("competitions")
      .select("id, competition_name, location, last_registration_date")
      .in("id", compIds);

    const compMap = new Map((comps || []).map((c: any) => [c.id, c]));

    let notifiedCount = 0;
    const notifications: any[] = [];
    const interestIds: string[] = [];

    for (const interest of interests) {
      const comp = compMap.get(interest.competition_id);
      if (!comp || !comp.last_registration_date) continue;

      const lastReg = comp.last_registration_date;
      let message: string | null = null;

      if (lastReg === fmt(in3Days)) {
        message = `⭐️ ${comp.competition_name} i ${comp.location} — anmälan stänger om 3 dagar!`;
      } else if (lastReg === fmt(in1Day)) {
        message = `⚠️ Sista chansen! ${comp.competition_name} stänger imorgon!`;
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
