import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let notificationsCreated = 0;

    // Get all friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, receiver_id")
      .eq("status", "accepted");

    if (!friendships || friendships.length === 0) {
      return new Response(JSON.stringify({ notificationsCreated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build friend map: userId -> set of friendIds
    const friendMap = new Map<string, Set<string>>();
    for (const f of friendships) {
      if (!friendMap.has(f.requester_id)) friendMap.set(f.requester_id, new Set());
      if (!friendMap.has(f.receiver_id)) friendMap.set(f.receiver_id, new Set());
      friendMap.get(f.requester_id)!.add(f.receiver_id);
      friendMap.get(f.receiver_id)!.add(f.requester_id);
    }

    const allUserIds = [...friendMap.keys()];

    // Get profiles for display names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, show_competitions_to_friends, show_results_to_friends")
      .in("user_id", allUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // 1. Competition notifications (planned_competitions today)
    const { data: todayComps } = await supabase
      .from("planned_competitions")
      .select("user_id, event_name, location")
      .gte("date", today)
      .lte("date", today)
      .in("user_id", allUserIds);

    for (const comp of todayComps || []) {
      const profile = profileMap.get(comp.user_id);
      if (!profile?.show_competitions_to_friends) continue;

      const friendIds = friendMap.get(comp.user_id);
      if (!friendIds) continue;

      for (const friendId of friendIds) {
        await supabase.from("notifications").insert({
          user_id: friendId,
          message: `🏆 ${profile.display_name || "Din kompis"} har tävling idag i ${comp.location || "okänd plats"} — skicka ett lycka till! 🐾`,
        });
        notificationsCreated++;
      }
    }

    // 2. Pin notifications (competition_results with passed=true from yesterday)
    const { data: yesterdayPins } = await supabase
      .from("competition_results")
      .select("user_id, dog_id")
      .eq("date", yesterday)
      .eq("passed", true)
      .in("user_id", allUserIds);

    if (yesterdayPins && yesterdayPins.length > 0) {
      // Get dog names
      const dogIds = [...new Set(yesterdayPins.map((p: any) => p.dog_id))];
      const { data: dogs } = await supabase
        .from("dogs")
        .select("id, name")
        .in("id", dogIds);
      const dogMap = new Map((dogs || []).map((d: any) => [d.id, d.name]));

      for (const pin of yesterdayPins) {
        const profile = profileMap.get(pin.user_id);
        if (!profile?.show_results_to_friends) continue;

        const friendIds = friendMap.get(pin.user_id);
        if (!friendIds) continue;

        const dogName = dogMap.get(pin.dog_id) || "sin hund";

        for (const friendId of friendIds) {
          await supabase.from("notifications").insert({
            user_id: friendId,
            message: `🎉 ${profile.display_name || "Din kompis"} loggade en pinne med ${dogName} — skicka ett grattis!`,
          });
          notificationsCreated++;
        }
      }
    }

    return new Response(JSON.stringify({ notificationsCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
