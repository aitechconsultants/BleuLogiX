import { RequestHandler } from "express";
import Stripe from "stripe";
import { queryOne, queryAll, query } from "../db";
import { LogContext, logWebhookProcessing, logError } from "../logging";
import { upsertUser, getUserByClerkId, User } from "../users";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20",
});

// Plan mapping from Stripe price IDs
const PRICE_TO_PLAN: Record<string, "pro" | "enterprise"> = {
  [process.env.STRIPE_PRICE_PRO || ""]: "pro",
  [process.env.STRIPE_PRICE_ENTERPRISE || ""]: "enterprise",
};

// Credit amounts per plan
const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  pro: 500,
  enterprise: 9999,
};

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
async function getOrCreateSubscription(userId: string): Promise<Subscription> {
  let sub = await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId],
  );

  if (!sub) {
    const result = await query<Subscription>(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, 'free', 'active')
       RETURNING *`,
      [userId],
    );
    sub = result.rows[0];
  }

  return sub;
}

// Helper: Calculate remaining credits
async function getCreditsRemaining(userId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
    [userId],
  );
  return result?.total || 0;
}

// Helper: Grant credits
async function grantCredits(
  userId: string,
  delta: number,
  reason: string,
): Promise<void> {
  await query(
    `INSERT INTO credit_ledger (user_id, delta, reason)
     VALUES ($1, $2, $3)`,
    [userId, delta, reason],
  );
}

// Helper: Write audit log entry
async function writeAuditLog(
  userId: string,
  eventType: string,
  previousPlan: string | null,
  newPlan: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  stripeEventId: string | null,
  stripeSubscriptionId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await query(
    `INSERT INTO subscription_audit_log 
     (user_id, event_type, previous_plan, new_plan, previous_status, new_status, stripe_event_id, stripe_subscription_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      userId,
      eventType,
      previousPlan,
      newPlan,
      previousStatus,
      newStatus,
      stripeEventId,
      stripeSubscriptionId,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

/**
 * Calculate effective plan based on precedence:
 * 1. Active plan_override (not expired) → return override
 * 2. Active Stripe subscription → return Stripe plan
 * 3. Default → free
 */
function calculateEffectivePlan(
  user: User,
  stripePlan?: "pro" | "enterprise",
  stripeStatus?: string,
): "free" | "pro" | "enterprise" {
  // Priority 1: Active override (not expired)
  if (user.plan_override) {
    if (
      !user.plan_override_expires_at ||
      new Date(user.plan_override_expires_at) > new Date()
    ) {
      return user.plan_override;
    }
  }

  // Priority 2: Active Stripe subscription
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    if (stripePlan) {
      return stripePlan;
    }
  }

  // Priority 3: Default to free
  return "free";
}

/**
 * Sync user's effective_plan in users table
 * Preserves: plan_override, role, clerk_user_id
 */
async function syncUserEffectivePlan(
  userId: string,
  stripePlan: "free" | "pro" | "enterprise",
  stripeStatus: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  periodEnd: Date | null,
): Promise<{ previousPlan: string; newPlan: string }> {
  // Get current user state
  const user = await queryOne<User>("SELECT * FROM users WHERE id = $1", [userId]);
  
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const previousPlan = user.effective_plan;
  const effectivePlan = calculateEffectivePlan(user, stripePlan === "free" ? undefined : stripePlan, stripeStatus);

  // Update user - preserve plan_override, role, clerk_user_id
  await query(
    `UPDATE users SET 
       effective_plan = $1,
       stripe_customer_id = COALESCE($2, stripe_customer_id),
       stripe_subscription_id = COALESCE($3, stripe_subscription_id),
       subscription_status = $4,
       current_period_end = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [
      effectivePlan,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeStatus,
      periodEnd,
      userId,
    ],
  );

  return { previousPlan, newPlan: effectivePlan };
}

export const handleCreateCheckoutSession: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { plan } = req.body as { plan: string };
    const auth = (req as any).auth;

    if (!auth || !auth.clerkUserId) {
      logError(
        { correlationId },
        "Checkout session requested without authentication",
      );
      return res.status(401).json({
        error: "Unauthorized",
        correlationId,
      });
    }

    // Upsert user and get internal UUID
    const user = await upsertUser(auth.clerkUserId, auth.email);
    const userId = user.id;

    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan",
        correlationId,
      });
    }

    let priceId = process.env.STRIPE_PRICE_PRO || "";
    if (plan === "enterprise") {
      priceId = process.env.STRIPE_PRICE_ENTERPRISE || "";
    }

    if (!priceId) {
      logError(
        { correlationId, userId },
        "Price ID not configured for plan",
        undefined,
        { plan },
      );
      return res.status(500).json({
        error: "Upgrade is temporarily unavailable. Please try again later.",
        correlationId,
      });
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
        [customerId, userId],
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:5173";
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
      success_url: `${appUrl}/generator?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/generator`,
      metadata: { userId, plan },
    });

    if (!session.url) {
      throw new Error("No checkout URL returned from Stripe");
    }

    res.json({ url: session.url });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to create checkout session",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to create checkout session",
      correlationId,
    });
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
    const body =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
  } catch (error) {
    logError(
      { correlationId },
      "Webhook signature verification failed",
      error instanceof Error ? error : new Error(String(error)),
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
      [event.id],
    );

    if (existingEvent) {
      logWebhookProcessing(
        { correlationId, stripeEventId: event.id },
        event.type,
        "Event already processed (idempotent)",
      );
      return res.json({ received: true });
    }

    // Insert event record BEFORE processing to prevent duplicate side effects
    await query(
      `INSERT INTO stripe_events (stripe_event_id, type, payload)
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event)],
    );

    let userId: string | undefined;
    let subscriptionId: string | undefined;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.metadata?.userId;
        const plan = (session.metadata?.plan || "pro") as "pro" | "enterprise";
        subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (userId) {
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          // Update subscriptions table
          await query(
            `UPDATE subscriptions
             SET stripe_subscription_id = $1, stripe_customer_id = $2, plan = $3, status = 'active', current_period_end = $4, updated_at = NOW()
             WHERE user_id = $5`,
            [subscriptionId, customerId, plan, periodEnd, userId],
          );

          // Sync users.effective_plan with precedence logic
          const { previousPlan, newPlan } = await syncUserEffectivePlan(
            userId,
            plan,
            "active",
            customerId,
            subscriptionId,
            periodEnd,
          );

          // Grant initial credits based on plan
          const creditAmount = PLAN_CREDITS[plan] || 500;
          await grantCredits(
            userId,
            creditAmount,
            `${plan.toUpperCase()} plan activation`,
          );

          // Write audit log
          await writeAuditLog(
            userId,
            "checkout_completed",
            previousPlan,
            newPlan,
            null,
            "active",
            event.id,
            subscriptionId,
            { credits_granted: creditAmount },
          );

          logWebhookProcessing(
            {
              correlationId,
              userId,
              stripeEventId: event.id,
              stripeSubscriptionId: subscriptionId,
            },
            event.type,
            "Checkout processed - effective_plan synced",
            { previousPlan, newPlan, creditsGranted: creditAmount },
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
          const periodEnd = new Date(subscription.current_period_end * 1000);

          // Get plan from price ID
          const priceId = subscription.items.data[0]?.price?.id || "";
          const plan = PRICE_TO_PLAN[priceId] || "pro";

          // Update subscriptions table
          await query(
            `UPDATE subscriptions
             SET status = $1, current_period_end = $2, plan = $3, updated_at = NOW()
             WHERE user_id = $4`,
            [status, periodEnd, plan, userId],
          );

          // Get previous state before sync
          const userBefore = await queryOne<User>("SELECT * FROM users WHERE id = $1", [userId]);
          const previousStatus = userBefore?.subscription_status || null;

          // Sync users.effective_plan with precedence logic
          const { previousPlan, newPlan } = await syncUserEffectivePlan(
            userId,
            plan,
            status,
            customerId,
            subscriptionId,
            periodEnd,
          );

          // Write audit log
          await writeAuditLog(
            userId,
            "subscription_updated",
            previousPlan,
            newPlan,
            previousStatus,
            status,
            event.id,
            subscriptionId,
          );

          logWebhookProcessing(
            {
              correlationId,
              userId,
              stripeEventId: event.id,
              stripeSubscriptionId: subscriptionId,
            },
            event.type,
            "Subscription updated - effective_plan synced",
            { status, previousPlan, newPlan },
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
          // Get previous state before changes
          const userBefore = await queryOne<User>("SELECT * FROM users WHERE id = $1", [userId]);
          const previousPlan = userBefore?.effective_plan || "free";
          const previousStatus = userBefore?.subscription_status || null;

          // Update subscriptions table
          await query(
            `UPDATE subscriptions
             SET plan = 'free', status = 'canceled', stripe_subscription_id = NULL, updated_at = NOW()
             WHERE user_id = $1`,
            [userId],
          );

          // Sync users.effective_plan - will respect plan_override if set
          const { newPlan } = await syncUserEffectivePlan(
            userId,
            "free",
            "canceled",
            customerId,
            null,
            null,
          );

          // Write audit log
          await writeAuditLog(
            userId,
            "subscription_deleted",
            previousPlan,
            newPlan,
            previousStatus,
            "canceled",
            event.id,
            subscriptionId,
          );

          logWebhookProcessing(
            {
              correlationId,
              userId,
              stripeEventId: event.id,
              stripeSubscriptionId: subscriptionId,
            },
            event.type,
            "Subscription deleted - effective_plan synced (override preserved)",
            { previousPlan, newPlan },
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
            [userId],
          );

          if (sub && sub.plan !== "free") {
            // Get the actual Stripe subscription to check current_period_end
            const stripeSubscription =
              await stripe.subscriptions.retrieve(subscriptionId);
            const currentPeriodEnd = new Date(
              stripeSubscription.current_period_end * 1000,
            );
            const lastGrantPeriodEnd = sub.last_credit_grant_period_end
              ? new Date(sub.last_credit_grant_period_end)
              : null;

            // Only grant if this is a different billing period
            if (
              !lastGrantPeriodEnd ||
              lastGrantPeriodEnd.getTime() !== currentPeriodEnd.getTime()
            ) {
              const creditAmount = PLAN_CREDITS[sub.plan] || 500;
              await grantCredits(
                userId,
                creditAmount,
                `${sub.plan.toUpperCase()} plan monthly renewal`,
              );

              // Update the period end to prevent duplicate grants
              await query(
                `UPDATE subscriptions
                 SET last_credit_grant_period_end = $1, updated_at = NOW()
                 WHERE user_id = $2`,
                [currentPeriodEnd, userId],
              );

              // Write audit log
              await writeAuditLog(
                userId,
                "invoice_paid",
                sub.plan,
                sub.plan,
                sub.status,
                sub.status,
                event.id,
                subscriptionId,
                { credits_granted: creditAmount, period_end: currentPeriodEnd.toISOString() },
              );

              logWebhookProcessing(
                {
                  correlationId,
                  userId,
                  stripeEventId: event.id,
                  stripeSubscriptionId: subscriptionId,
                },
                event.type,
                "Monthly credits renewed",
                { amount: creditAmount },
              );
            } else {
              logWebhookProcessing(
                {
                  correlationId,
                  userId,
                  stripeEventId: event.id,
                  stripeSubscriptionId: subscriptionId,
                },
                event.type,
                "Invoice paid but credits already granted for this period",
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
          "Event type not handled",
        );
    }

    res.json({ received: true });
  } catch (error) {
    logError(
      { correlationId },
      "Webhook processing failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Webhook processing failed",
      correlationId,
    });
  }
};

export const handleCreatePortalSession: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const auth = (req as any).auth;

    if (!auth || !auth.clerkUserId) {
      logError(
        { correlationId },
        "Portal session requested without authentication",
      );
      return res.status(401).json({
        error: "Unauthorized",
        correlationId,
      });
    }

    // Upsert user and get internal UUID
    const user = await upsertUser(auth.clerkUserId, auth.email);
    const userId = user.id;

    const sub = await getOrCreateSubscription(userId);

    if (!sub.stripe_customer_id) {
      logError(
        { correlationId, userId },
        "Portal session requested but no Stripe customer found",
      );
      return res.status(400).json({
        error: "No active billing account. Please upgrade first.",
        correlationId,
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.APP_URL || "http://localhost:5173"}/video`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to create portal session",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to create portal session",
      correlationId,
    });
  }
};
