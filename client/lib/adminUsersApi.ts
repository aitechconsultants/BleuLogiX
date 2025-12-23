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

type ApiFetch = (path: string, options?: any) => Promise<any>;

export async function getAllUsers(
  apiFetch: ApiFetch,
  limit: number = 100,
  offset: number = 0,
): Promise<User[]> {
  const data: GetUsersResponse = await apiFetch(
    `/api/admin/users?limit=${limit}&offset=${offset}`,
  );
  return data.users;
}

export async function updateUserRole(
  apiFetch: ApiFetch,
  userId: string,
  role: "user" | "admin" | "superadmin",
): Promise<User> {
  const data = await apiFetch(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    body: { userId, role },
  });
  return data.user;
}

export async function setPlanOverride(
  apiFetch: ApiFetch,
  userId: string,
  plan: string,
  expiresAt?: string,
  reason?: string,
): Promise<User> {
  const data = await apiFetch(`/api/admin/users/${userId}/plan-override`, {
    method: "PUT",
    body: {
      userId,
      plan,
      expiresAt: expiresAt || null,
      reason: reason || null,
    },
  });
  return data.user;
}

export async function clearPlanOverride(
  apiFetch: ApiFetch,
  userId: string,
): Promise<User> {
  const data = await apiFetch(`/api/admin/users/${userId}/plan-override`, {
    method: "DELETE",
    body: { userId },
  });
  return data.user;
}
