import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    // Check if this user was referred (has friend_invite in signup_sources)
    const { data: source } = await supabase
      .from("signup_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("utm_source", "friend_invite")
      .single();

    if (!source?.referrer) {
      return new Response(JSON.stringify({ rewarded: false, reason: "no_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const referrerCode = source.referrer;

    // Find referrer by referral_code
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("referral_code", referrerCode)
      .single();

    if (!referrerProfile) {
      return new Response(JSON.stringify({ rewarded: false, reason: "referrer_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already rewarded
    const { data: existing } = await supabase
      .from("referral_rewards")
      .select("id")
      .eq("referrer_id", referrerProfile.user_id)
      .eq("referred_id", userId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ rewarded: false, reason: "already_rewarded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create reward entry
    await supabase.from("referral_rewards").insert({
      referrer_id: referrerProfile.user_id,
      referred_id: userId,
      referrer_rewarded_at: new Date().toISOString(),
      referred_converted_at: new Date().toISOString(),
      days_granted: 7,
    });

    // Notify referrer
    const { data: referredProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();

    await supabase.from("notifications").insert({
      user_id: referrerProfile.user_id,
      message: `🎉 ${referredProfile?.display_name || "Din kompis"} gick upp till premium! Du fick 7 dagars gratis premium som tack!`,
    });

    return new Response(JSON.stringify({ rewarded: true, days: 7 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
