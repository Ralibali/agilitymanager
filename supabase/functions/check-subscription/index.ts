import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check admin-granted premium (premium_until in profiles)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('premium_until')
      .eq('user_id', user.id)
      .single();

    if (profile?.premium_until) {
      const premiumUntil = new Date(profile.premium_until);
      const now = new Date();
      // premium_until far in the future = lifetime (year 2099+)
      if (premiumUntil > now) {
        logStep("Admin-granted premium active", { premium_until: profile.premium_until });
        return new Response(JSON.stringify({
          subscribed: true,
          is_trial: false,
          subscription_end: premiumUntil.toISOString(),
          product_id: null,
          price_id: null,
          admin_granted: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        const trialEnd = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        logStep("User is in 7-day free trial (no Stripe customer)");
        return new Response(JSON.stringify({
          subscribed: true, is_trial: true,
          subscription_end: trialEnd.toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let priceId = null;
    let subscriptionEnd = null;
    let isTrial = false;

    if (!hasActiveSub) {
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        hasActiveSub = true;
        isTrial = true;
        const trialEnd = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        subscriptionEnd = trialEnd.toISOString();
        logStep("User is in 7-day free trial");
      }
    }

    if (!isTrial && subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const endTimestamp = subscription.current_period_end;
      if (endTimestamp && typeof endTimestamp === 'number' && endTimestamp > 0) {
        try {
          const endDate = new Date(endTimestamp * 1000);
          if (!isNaN(endDate.getTime())) {
            subscriptionEnd = endDate.toISOString();
          }
        } catch {
          logStep("Could not parse subscription end date", { endTimestamp });
        }
      }
      productId = subscription.items?.data?.[0]?.price?.product ?? null;
      priceId = subscription.items?.data?.[0]?.price?.id ?? null;
      logStep("Active subscription found", { subscriptionEnd, productId, priceId });
    } else if (!isTrial) {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      is_trial: isTrial,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
