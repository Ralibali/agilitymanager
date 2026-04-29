import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Only POST allowed
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
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
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Handle relevant subscription events
  const relevantEvents = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.completed",
  ];

  if (!relevantEvents.includes(event.type)) {
    logStep("Ignoring event type", { type: event.type });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.customer || !session.subscription) {
        logStep("Checkout session not a subscription, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Ensure customer_id is saved to profile
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (customerEmail) {
        // Find user by email via auth admin
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === customerEmail);
        if (user) {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", user.id);
          logStep("Saved stripe_customer_id from checkout", { userId: user.id, customerId });
        }
      }

      // The subscription.created event will handle the rest
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // For subscription events
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

    logStep("Processing subscription event", {
      customerId,
      status: subscription.status,
      subscriptionId: subscription.id,
    });

    // Get customer email from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      logStep("Customer deleted, skipping");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const email = (customer as Stripe.Customer).email;
    if (!email) {
      logStep("No email on customer, skipping");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (!user) {
      logStep("No matching user found for email", { email });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Extract subscription details
    const isActive = ["active", "trialing"].includes(subscription.status);
    const priceItem = subscription.items?.data?.[0]?.price;
    const productId = priceItem?.product
      ? (typeof priceItem.product === "string" ? priceItem.product : priceItem.product.id)
      : null;
    const priceId = priceItem?.id ?? null;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    // Update profiles table
    const updateData: Record<string, unknown> = {
      stripe_customer_id: customerId,
      stripe_subscription_status: isActive ? "active" : subscription.status,
      stripe_product_id: productId,
      stripe_price_id: priceId,
      stripe_current_period_end: periodEnd,
    };

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      logStep("ERROR updating profile", { error: updateError.message, userId: user.id });
      return new Response(JSON.stringify({ error: "Failed to update profile" }), { status: 500 });
    }

    logStep("Profile updated successfully", {
      userId: user.id,
      status: updateData.stripe_subscription_status,
      productId,
      periodEnd,
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    logStep("ERROR processing event", { error: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
