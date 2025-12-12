import { RequestHandler } from "express";
import Stripe from "stripe";
import { queryOne, queryAll, query } from "../db";
import { LogContext, logWebhookProcessing, logError } from "../logging";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20",
});

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "trialing" | "canceled" | "past_due";
  current_period_end: string | null;
  last_credit_grant_period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface CreditLedgerEntry {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  related_generation_id: string | null;
  created_at: string;
}

// Helper: Get or create subscription record
async function getOrCreateSubscription(
  userId: string
): Promise<Subscription> {
  let sub = await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId]
  );

  if (!sub) {
    const result = await query<Subscription>(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, 'free', 'active')
       RETURNING *`,
      [userId]
    );
    sub = result.rows[0];
  }

  return sub;
}

// Helper: Calculate remaining credits
async function getCreditsRemaining(userId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
    [userId]
  );
  return result?.total || 0;
}

// Helper: Grant credits
async function grantCredits(
  userId: string,
  delta: number,
  reason: string
): Promise<void> {
  await query(
    `INSERT INTO credit_ledger (user_id, delta, reason)
     VALUES ($1, $2, $3)`,
    [userId, delta, reason]
  );
}

export const handleCreateCheckoutSession: RequestHandler = async (
  req,
  res
) => {
  try {
    const { plan } = req.body as { plan: string };
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    let priceId = process.env.STRIPE_PRICE_PRO || "";
    if (plan === "enterprise") {
      priceId = process.env.STRIPE_PRICE_ENTERPRISE || "";
    }

    if (!priceId) {
      return res
        .status(500)
        .json({ error: "Price ID not configured for this plan" });
    }

    const sub = await getOrCreateSubscription(userId);

    let customerId = sub.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
      });
      customerId = customer.id;

      await query(
        `UPDATE subscriptions SET stripe_customer_id = $1 WHERE user_id = $2`,
        [customerId, userId]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL || "http://localhost:5173"}/generator?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "http://localhost:5173"}/generator`,
      metadata: { userId, plan },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

export const handleWebhook: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const sig = req.headers["stripe-signature"];

  if (!sig || typeof sig !== "string") {
    return res.status(400).json({
      error: "Missing signature",
      correlationId,
    });
  }

  let event: Stripe.Event;

  try {
    const body = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    logError(
      { correlationId },
      "Webhook signature verification failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(400).json({
      error: "Signature verification failed",
      correlationId,
    });
  }

  try {
    // Check for idempotency: has this event been processed before?
    const existingEvent = await queryOne<{ id: string }>(
      "SELECT id FROM stripe_events WHERE stripe_event_id = $1",
      [event.id]
    );

    if (existingEvent) {
      logWebhookProcessing(
        { correlationId, stripeEventId: event.id },
        event.type,
        "Event already processed (idempotent)"
      );
      return res.json({ received: true });
    }

    // Insert event record BEFORE processing to prevent duplicate side effects
    await query(
      `INSERT INTO stripe_events (stripe_event_id, type, payload)
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event)]
    );

    let userId: string | undefined;
    let subscriptionId: string | undefined;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        subscriptionId = session.subscription as string;

        if (userId && plan) {
          // Update subscription
          const periodEnd = new Date(
            subscription.current_period_end * 1000
          );

          await query(
            `UPDATE subscriptions
             SET stripe_subscription_id = $1, plan = $2, status = 'active', current_period_end = $3, updated_at = NOW()
             WHERE user_id = $4`,
            [subscriptionId, plan, periodEnd, userId]
          );

          // Grant initial credits based on plan
          const creditAmount = plan === "enterprise" ? 9999 : 500;
          await grantCredits(
            userId,
            creditAmount,
            `${plan.toUpperCase()} plan activation`
          );

          logWebhookProcessing(
            { correlationId, userId, stripeEventId: event.id, stripeSubscriptionId: subscriptionId },
            event.type,
            "Checkout session processed - credits granted"
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        subscriptionId = subscription.id;

        const customer = await stripe.customers.retrieve(customerId);
        userId = (customer as any).metadata?.userId;

        if (userId) {
          const status = subscription.status as
            | "active"
            | "trialing"
            | "canceled"
            | "past_due";
          await query(
            `UPDATE subscriptions
             SET status = $1, current_period_end = $2, updated_at = NOW()
             WHERE user_id = $3`,
            [status, new Date(subscription.current_period_end * 1000), userId]
          );

          logWebhookProcessing(
            { correlationId, userId, stripeEventId: event.id, stripeSubscriptionId: subscriptionId },
            event.type,
            "Subscription status updated",
            { status }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        subscriptionId = subscription.id;

        const customer = await stripe.customers.retrieve(customerId);
        userId = (customer as any).metadata?.userId;

        if (userId) {
          await query(
            `UPDATE subscriptions
             SET plan = 'free', status = 'canceled', stripe_subscription_id = NULL, updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
          );

          logWebhookProcessing(
            { correlationId, userId, stripeEventId: event.id, stripeSubscriptionId: subscriptionId },
            event.type,
            "Subscription deleted - downgraded to free"
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        subscriptionId = invoice.subscription as string;

        const customer = await stripe.customers.retrieve(customerId);
        userId = (customer as any).metadata?.userId;

        if (userId && subscriptionId) {
          const sub = await queryOne<Subscription>(
            "SELECT * FROM subscriptions WHERE user_id = $1",
            [userId]
          );

          if (sub && sub.plan !== "free") {
            // Check if we've already granted credits for this period
            const currentPeriodEnd = new Date(Date.now());
            const lastGrantPeriodEnd = sub.last_credit_grant_period_end
              ? new Date(sub.last_credit_grant_period_end)
              : null;

            // Only grant if this is a different period
            if (!lastGrantPeriodEnd || lastGrantPeriodEnd.getTime() !== currentPeriodEnd.getTime()) {
              const creditAmount = sub.plan === "enterprise" ? 9999 : 500;
              await grantCredits(
                userId,
                creditAmount,
                `${sub.plan.toUpperCase()} plan monthly renewal`
              );

              // Update the period end to prevent duplicate grants
              await query(
                `UPDATE subscriptions
                 SET last_credit_grant_period_end = $1, updated_at = NOW()
                 WHERE user_id = $2`,
                [new Date(), userId]
              );

              logWebhookProcessing(
                { correlationId, userId, stripeEventId: event.id, stripeSubscriptionId: subscriptionId },
                event.type,
                "Monthly credits renewed",
                { amount: creditAmount }
              );
            } else {
              logWebhookProcessing(
                { correlationId, userId, stripeEventId: event.id, stripeSubscriptionId: subscriptionId },
                event.type,
                "Invoice paid but credits already granted for this period"
              );
            }
          }
        }
        break;
      }

      default:
        logWebhookProcessing(
          { correlationId, stripeEventId: event.id },
          event.type,
          "Event type not handled"
        );
    }

    res.json({ received: true });
  } catch (error) {
    logError(
      { correlationId },
      "Webhook processing failed",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: "Webhook processing failed",
      correlationId,
    });
  }
};

export const handleCreatePortalSession: RequestHandler = async (
  req,
  res
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sub = await getOrCreateSubscription(userId);

    if (!sub.stripe_customer_id) {
      return res
        .status(400)
        .json({ error: "No Stripe customer found for this user" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.APP_URL || "http://localhost:5173"}/generator`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
};
