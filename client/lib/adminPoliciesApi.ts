export interface PlanPolicy {
  plan_key: string;
  social_accounts_limit: number;
  allow_scheduled_refresh: boolean;
  allow_oauth: boolean;
  default_refresh_interval_hours: number;
  updated_at: string;
}

export interface WorkspacePolicyOverride {
  workspace_id: string;
  social_accounts_limit?: number;
  allow_scheduled_refresh?: boolean;
  allow_oauth?: boolean;
  updated_at: string;
}

type ApiFetch = (path: string, options?: any) => Promise<any>;

export async function getPlanPolicies(
  apiFetch: ApiFetch,
): Promise<PlanPolicy[]> {
  const data = await apiFetch("/api/admin/plan-policies");
  return data.policies;
}

export async function updatePlanPolicy(
  apiFetch: ApiFetch,
  planKey: string,
  updates: Partial<Omit<PlanPolicy, "plan_key" | "updated_at">>,
): Promise<PlanPolicy> {
  const data = await apiFetch(`/api/admin/plan-policies/${planKey}`, {
    method: "PUT",
    body: updates,
  });
  return data.policy;
}

export async function getWorkspaceOverrides(
  apiFetch: ApiFetch,
  workspaceId?: string,
): Promise<WorkspacePolicyOverride[]> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.append("workspace_id", workspaceId);
  }

  const data = await apiFetch(`/api/admin/workspace-overrides?${params}`);
  return data.overrides;
}

export async function updateWorkspaceOverride(
  apiFetch: ApiFetch,
  workspaceId: string,
  updates: Partial<
    Omit<WorkspacePolicyOverride, "workspace_id" | "updated_at">
  >,
): Promise<WorkspacePolicyOverride> {
  const data = await apiFetch(`/api/admin/workspace-overrides/${workspaceId}`, {
    method: "PUT",
    body: updates,
  });
  return data.override;
}

export async function deleteWorkspaceOverride(
  apiFetch: ApiFetch,
  workspaceId: string,
): Promise<void> {
  await apiFetch(`/api/admin/workspace-overrides/${workspaceId}`, {
    method: "DELETE",
  });
}
