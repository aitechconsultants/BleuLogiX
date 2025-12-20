import { query, queryOne } from "./db";

export interface User {
  id: string;
  clerk_user_id: string;
  email: string | null;
  role: "user" | "admin" | "superadmin";
  effective_plan: "free" | "pro" | "enterprise";
  plan_override: "free" | "pro" | "enterprise" | null;
  plan_override_expires_at: string | null;
  plan_override_reason: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "trialing" | "canceled" | "past_due" | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a user - creates or updates based on clerk_user_id
 * Returns the internal user UUID
 */
export async function upsertUser(
  clerkUserId: string,
  email?: string,
): Promise<User> {
  // Try to find existing user
  let user = await queryOne<User>(
    "SELECT * FROM users WHERE clerk_user_id = $1",
    [clerkUserId],
  );

  if (user) {
    // Update email if provided and different
    if (email && email !== user.email) {
      const result = await query<User>(
        "UPDATE users SET email = $1, updated_at = NOW() WHERE clerk_user_id = $2 RETURNING *",
        [email, clerkUserId],
      );
      user = result.rows[0];
    }
    return user;
  }

  // Create new user
  const result = await query<User>(
    `INSERT INTO users (clerk_user_id, email, role)
     VALUES ($1, $2, 'user')
     RETURNING *`,
    [clerkUserId, email || null],
  );

  return result.rows[0];
}

/**
 * Get user by internal UUID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return queryOne<User>("SELECT * FROM users WHERE id = $1", [userId]);
}

/**
 * Get user by Clerk user ID
 */
export async function getUserByClerkId(
  clerkUserId: string,
): Promise<User | null> {
  return queryOne<User>("SELECT * FROM users WHERE clerk_user_id = $1", [
    clerkUserId,
  ]);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(
  limit: number = 100,
  offset: number = 0,
): Promise<User[]> {
  return queryAll<User>(
    "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: "user" | "admin" | "superadmin",
): Promise<User> {
  const result = await query<User>(
    "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [role, userId],
  );
  return result.rows[0];
}

/**
 * Set plan override for a user
 */
export async function setPlanOverride(
  userId: string,
  plan: "free" | "pro" | "enterprise",
  expiresAt?: string,
  reason?: string,
): Promise<User> {
  const result = await query<User>(
    `UPDATE users SET plan_override = $1, plan_override_expires_at = $2, plan_override_reason = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [plan, expiresAt || null, reason || null, userId],
  );
  return result.rows[0];
}

/**
 * Clear plan override for a user
 */
export async function clearPlanOverride(userId: string): Promise<User> {
  const result = await query<User>(
    `UPDATE users SET plan_override = NULL, plan_override_expires_at = NULL, plan_override_reason = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [userId],
  );
  return result.rows[0];
}

/**
 * Recalculate effective plan based on override and Stripe status
 * Priority: Active override > Stripe subscription > Free
 */
export function calculateEffectivePlan(
  user: User,
): "free" | "pro" | "enterprise" {
  // Check if override exists and is not expired
  if (user.plan_override) {
    if (
      !user.plan_override_expires_at ||
      new Date(user.plan_override_expires_at) > new Date()
    ) {
      return user.plan_override;
    }
  }

  // Check Stripe subscription status
  if (
    user.subscription_status === "active" ||
    user.subscription_status === "trialing"
  ) {
    // Map Stripe plan to our plan types - assume subscription_status maps to a plan
    // This would need to be enhanced based on actual Stripe plan data
    if (user.stripe_subscription_id) {
      // For now, return pro if subscription exists; enhance as needed
      return "pro";
    }
  }

  // Default to free
  return "free";
}
