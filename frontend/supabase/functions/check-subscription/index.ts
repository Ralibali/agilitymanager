import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");

    // Create a user-context client with the Authorization header to validate the session
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Read cached profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('premium_until, stripe_subscription_status, stripe_product_id, stripe_price_id, stripe_current_period_end')
      .eq('user_id', user.id)
      .single();

    // 1. Check admin-granted premium
    if (profile?.premium_until) {
      const premiumUntil = new Date(profile.premium_until);
      if (premiumUntil > new Date()) {
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

    // 2. Check cached Stripe subscription from webhook-synced data
    if (profile?.stripe_subscription_status === 'active') {
      logStep("Cached active subscription found", {
        productId: profile.stripe_product_id,
        periodEnd: profile.stripe_current_period_end,
      });
      return new Response(JSON.stringify({
        subscribed: true,
        is_trial: false,
        product_id: profile.stripe_product_id,
        price_id: profile.stripe_price_id,
        subscription_end: profile.stripe_current_period_end,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Check 7-day free trial based on account age
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      const trialEnd = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      logStep("User is in 7-day free trial");
      return new Response(JSON.stringify({
        subscribed: true,
        is_trial: true,
        subscription_end: trialEnd.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Fallback: query Stripe API directly (for users who subscribed before webhook was set up)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const priceItem = sub.items?.data?.[0]?.price;
          const productId = priceItem?.product
            ? (typeof priceItem.product === "string" ? priceItem.product : priceItem.product.id)
            : null;
          const priceId = priceItem?.id ?? null;
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          // Cache for next time
          await supabaseClient.from('profiles').update({
            stripe_customer_id: customerId,
            stripe_subscription_status: 'active',
            stripe_product_id: productId,
            stripe_price_id: priceId,
            stripe_current_period_end: periodEnd,
          }).eq('user_id', user.id);

          logStep("Fallback: found active subscription via Stripe API, cached it", { productId });

          return new Response(JSON.stringify({
            subscribed: true,
            is_trial: false,
            product_id: productId,
            price_id: priceId,
            subscription_end: periodEnd,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    logStep("No active subscription");
    return new Response(JSON.stringify({ subscribed: false }), {
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
