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
  effective_plan_calculated?: "free" | "pro" | "enterprise";
}

export interface GetUsersResponse {
  users: User[];
  limit: number;
  offset: number;
}

export async function getAllUsers(
  limit: number = 100,
  offset: number = 0
): Promise<User[]> {
  const response = await fetch(
    `/api/admin/users?limit=${limit}&offset=${offset}`,
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch users");
  }

  const data: GetUsersResponse = await response.json();
  return data.users;
}

export async function updateUserRole(
  userId: string,
  role: "user" | "admin" | "superadmin"
): Promise<User> {
  const response = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update user role");
  }

  const data = await response.json();
  return data.user;
}

export async function setPlanOverride(
  userId: string,
  plan: string,
  expiresAt?: string,
  reason?: string
): Promise<User> {
  const response = await fetch(`/api/admin/users/${userId}/plan-override`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      plan,
      expiresAt: expiresAt || null,
      reason: reason || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set plan override");
  }

  const data = await response.json();
  return data.user;
}

export async function clearPlanOverride(userId: string): Promise<User> {
  const response = await fetch(`/api/admin/users/${userId}/plan-override`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to clear plan override");
  }

  const data = await response.json();
  return data.user;
}
