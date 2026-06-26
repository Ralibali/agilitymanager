import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIAL_DAYS = 14;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "Server configuration is incomplete" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Authentication required" }, 401);

    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user?.email) return jsonResponse({ error: "User not authenticated" }, 401);

    const user = userData.user;
    const now = new Date();
    logStep("User authenticated", { userId: user.id });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("premium_until, stripe_subscription_status, stripe_product_id, stripe_price_id, stripe_current_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    if (profile?.premium_until) {
      const premiumUntil = new Date(profile.premium_until);
      if (!Number.isNaN(premiumUntil.getTime()) && premiumUntil > now) {
        return jsonResponse({
          subscribed: true,
          is_trial: false,
          subscription_end: premiumUntil.toISOString(),
          product_id: null,
          price_id: null,
          admin_granted: true,
        });
      }
    }

    if (profile?.stripe_subscription_status === "active") {
      const periodEnd = profile.stripe_current_period_end
        ? new Date(profile.stripe_current_period_end)
        : null;
      const cacheIsCurrent = !periodEnd || Number.isNaN(periodEnd.getTime()) || periodEnd > now;

      if (cacheIsCurrent) {
        return jsonResponse({
          subscribed: true,
          is_trial: false,
          product_id: profile.stripe_product_id,
          price_id: profile.stripe_price_id,
          subscription_end: profile.stripe_current_period_end,
        });
      }

      logStep("Cached subscription has expired; verifying with Stripe", {
        periodEnd: profile.stripe_current_period_end,
      });
    }

    const createdAt = new Date(user.created_at);
    const diffDays = (now.getTime() - createdAt.getTime()) / 86_400_000;
    if (diffDays >= 0 && diffDays <= TRIAL_DAYS) {
      const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 86_400_000);
      return jsonResponse({
        subscribed: true,
        is_trial: true,
        subscription_end: trialEnd.toISOString(),
        product_id: null,
        price_id: null,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      let customerId = profile?.stripe_customer_id ?? null;

      if (!customerId) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = customers.data[0]?.id ?? null;
      }

      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 20,
        });
        const activeSubscription = subscriptions.data.find((subscription) =>
          ["active", "trialing"].includes(subscription.status),
        );

        if (activeSubscription) {
          const priceItem = activeSubscription.items?.data?.[0]?.price;
          const productId = priceItem?.product
            ? typeof priceItem.product === "string"
              ? priceItem.product
              : priceItem.product.id
            : null;
          const priceId = priceItem?.id ?? null;
          const periodEnd = activeSubscription.current_period_end
            ? new Date(activeSubscription.current_period_end * 1000).toISOString()
            : null;

          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_status: "active",
              stripe_product_id: productId,
              stripe_price_id: priceId,
              stripe_current_period_end: periodEnd,
            })
            .eq("user_id", user.id);

          return jsonResponse({
            subscribed: true,
            is_trial: false,
            product_id: productId,
            price_id: priceId,
            subscription_end: periodEnd,
          });
        }

        if (profile?.stripe_subscription_status === "active") {
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_subscription_status: "none",
              stripe_product_id: null,
              stripe_price_id: null,
              stripe_current_period_end: null,
            })
            .eq("user_id", user.id);
        }
      }
    }

    return jsonResponse({
      subscribed: false,
      is_trial: false,
      product_id: null,
      price_id: null,
      subscription_end: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return jsonResponse({ error: "Kunde inte kontrollera prenumerationen" }, 500);
  }
});
