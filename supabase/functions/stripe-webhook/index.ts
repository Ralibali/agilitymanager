import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

type AdminClient = ReturnType<typeof createClient>;

async function findUserIdByEmail(supabaseAdmin: AdminClient, email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }

  return null;
}

async function resolveUserId(
  supabaseAdmin: AdminClient,
  options: { metadataUserId?: string | null; customerId?: string | null; email?: string | null },
): Promise<string | null> {
  if (options.metadataUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(options.metadataUserId);
    if (!error && data.user) return data.user.id;
  }

  if (options.customerId) {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", options.customerId)
      .maybeSingle();
    if (!error && profile?.user_id) return profile.user_id;
  }

  if (options.email) return findUserIdByEmail(supabaseAdmin, options.email);
  return null;
}

function subscriptionFields(subscription: Stripe.Subscription, customerId: string) {
  const isActive = ["active", "trialing"].includes(subscription.status);
  const priceItem = subscription.items?.data?.[0]?.price;
  const productId = priceItem?.product
    ? typeof priceItem.product === "string"
      ? priceItem.product
      : priceItem.product.id
    : null;
  const priceId = priceItem?.id ?? null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  return {
    stripe_customer_id: customerId,
    stripe_subscription_status: isActive ? "active" : subscription.status,
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_current_period_end: periodEnd,
  };
}

async function updateProfileSubscription(
  supabaseAdmin: AdminClient,
  userId: string,
  fields: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(fields)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    logStep("ERROR", { message: "Missing Stripe or Supabase server configuration" });
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("ERROR", { message: "Missing stripe-signature header" });
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error) {
    logStep("Signature verification failed", { error: String(error) });
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const relevantEvents = new Set([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.completed",
  ]);
  if (!relevantEvents.has(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.customer) {
        logStep("Checkout session is not a subscription, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
      const email = session.customer_details?.email || session.customer_email;
      const metadataUserId = session.client_reference_id || session.metadata?.user_id;
      const userId = await resolveUserId(supabaseAdmin, { metadataUserId, customerId, email });

      if (!userId) {
        logStep("No matching user for checkout", { customerId, email, metadataUserId });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const fields: Record<string, unknown> = { stripe_customer_id: customerId };
      if (session.subscription) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        Object.assign(fields, subscriptionFields(subscription, customerId));
      }

      await updateProfileSubscription(supabaseAdmin, userId, fields);
      logStep("Checkout linked to profile", { userId, customerId });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

    let email: string | null = null;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) email = (customer as Stripe.Customer).email;

    const userId = await resolveUserId(supabaseAdmin, {
      metadataUserId: subscription.metadata?.user_id,
      customerId,
      email,
    });

    if (!userId) {
      logStep("No matching user for subscription", {
        customerId,
        email,
        metadataUserId: subscription.metadata?.user_id,
      });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const fields = subscriptionFields(subscription, customerId);
    await updateProfileSubscription(supabaseAdmin, userId, fields);

    logStep("Profile subscription updated", {
      userId,
      status: fields.stripe_subscription_status,
      priceId: fields.stripe_price_id,
      periodEnd: fields.stripe_current_period_end,
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    logStep("ERROR processing event", { error: String(error) });
    return new Response(JSON.stringify({ error: "Failed to process Stripe event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
