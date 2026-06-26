import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_ORIGIN = "https://agilitymanager.se";
const ALLOWED_PRICE_IDS = new Set([
  "price_1TNX9dHzffTezY82QlVT1FEA", // 79 kr/mån
  "price_1TNXAAHzffTezY82jUjqyL3f", // 790 kr/år
  "price_1T9AioHzffTezY82OrEqKflT", // äldre månadsplan
  "price_1T9AomHzffTezY82vtiObR7E", // äldre årsplan
]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSafeOrigin(req: Request): string {
  const rawOrigin = req.headers.get("origin");
  if (!rawOrigin) return DEFAULT_ORIGIN;

  try {
    const url = new URL(rawOrigin);
    const isProduction =
      url.origin === DEFAULT_ORIGIN ||
      url.origin === "https://www.agilitymanager.se";
    const isPreview = url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
    const isLocal =
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.protocol === "http:" || url.protocol === "https:");

    return isProduction || isPreview || isLocal ? url.origin : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !stripeKey) {
      throw new Error("Server payment configuration is incomplete");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.slice("Bearer ".length);
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !data.user?.email) {
      return jsonResponse({ error: "User not authenticated" }, 401);
    }
    const user = data.user;

    let payload: { priceId?: unknown };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const priceId = typeof payload.priceId === "string" ? payload.priceId : "";
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return jsonResponse({ error: "Invalid priceId" }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = getSafeOrigin(req);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/v3/settings?checkout=success`,
      cancel_url: `${origin}/v3/settings?checkout=cancel`,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    if (!session.url) throw new Error("Stripe checkout session has no URL");
    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CHECKOUT]", message);
    return jsonResponse({ error: "Kunde inte starta betalningen" }, 500);
  }
});
