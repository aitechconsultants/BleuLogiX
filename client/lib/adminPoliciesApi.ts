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

export async function getPlanPolicies(): Promise<PlanPolicy[]> {
  const response = await fetch("/api/admin/plan-policies");
  if (!response.ok) {
    throw new Error("Failed to fetch plan policies");
  }
  const data = await response.json();
  return data.policies;
}

export async function updatePlanPolicy(
  planKey: string,
  updates: Partial<Omit<PlanPolicy, "plan_key" | "updated_at">>
): Promise<PlanPolicy> {
  const response = await fetch(`/api/admin/plan-policies/${planKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update plan policy");
  }

  const data = await response.json();
  return data.policy;
}

export async function getWorkspaceOverrides(
  workspaceId?: string
): Promise<WorkspacePolicyOverride[]> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.append("workspace_id", workspaceId);
  }

  const response = await fetch(`/api/admin/workspace-overrides?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch workspace overrides");
  }

  const data = await response.json();
  return data.overrides;
}

export async function updateWorkspaceOverride(
  workspaceId: string,
  updates: Partial<Omit<WorkspacePolicyOverride, "workspace_id" | "updated_at">>
): Promise<WorkspacePolicyOverride> {
  const response = await fetch(`/api/admin/workspace-overrides/${workspaceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update workspace override");
  }

  const data = await response.json();
  return data.override;
}

export async function deleteWorkspaceOverride(workspaceId: string): Promise<void> {
  const response = await fetch(`/api/admin/workspace-overrides/${workspaceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete workspace override");
  }
}
