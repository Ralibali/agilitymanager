import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Standardpriser (alla användare)
const STANDARD_PRICES: Record<string, string> = {
  "1": "price_1TNXAKHzffTezY82hltLm2WX", // 149 kr
  "3": "price_1TNXAMHzffTezY82kuSOBqpr", // 399 kr
  "5": "price_1TNXANHzffTezY82iPu6zLSg", // 599 kr
};

// Pro-priser (~50% rabatt)
const PRO_PRICES: Record<string, string> = {
  "1": "price_1TOO6EHzffTezY82wczNaQsZ", // 79 kr
  "3": "price_1TOO6FHzffTezY825x4iGmp5", // 199 kr
  "5": "price_1TOO6GHzffTezY82Y2DfO0cO", // 299 kr
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    let pack = "1";
    try {
      const body = await req.json();
      if (body?.pack && STANDARD_PRICES[String(body.pack)]) {
        pack = String(body.pack);
      }
    } catch {
      // Ingen body → default 1-pack
    }

    // Server-side Pro-check (aldrig lita på klient)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_subscription_status, premium_until")
      .eq("user_id", user.id)
      .maybeSingle();

    let isPro = profile?.stripe_subscription_status === "active";
    if (!isPro && profile?.premium_until) {
      isPro = new Date(profile.premium_until as string) > new Date();
    }

    const priceMap = isPro ? PRO_PRICES : STANDARD_PRICES;
    const priceId = priceMap[pack];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      metadata: {
        coach_video_credits: pack,
        is_pro_price: String(isPro),
      },
      success_url: `${req.headers.get("origin")}/training?coach_paid=true&pack=${pack}`,
      cancel_url: `${req.headers.get("origin")}/training`,
    });

    return new Response(JSON.stringify({ url: session.url, isPro }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
