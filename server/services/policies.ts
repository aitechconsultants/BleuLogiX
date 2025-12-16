import { queryOne } from "../db";

export interface PlanPolicy {
  plan_key: string;
  social_accounts_limit: number;
  allow_scheduled_refresh: boolean;
  allow_oauth: boolean;
  default_refresh_interval_hours: number;
}

export interface WorkspacePolicyOverride {
  workspace_id: string;
  social_accounts_limit?: number;
  allow_scheduled_refresh?: boolean;
  allow_oauth?: boolean;
}

export interface ResolvedPolicy {
  social_accounts_limit: number;
  allow_scheduled_refresh: boolean;
  allow_oauth: boolean;
  default_refresh_interval_hours: number;
}

// Resolve effective policy: workspace override → plan policy fallback
export async function resolvePolicy(
  plan: string,
  workspaceId?: string
): Promise<ResolvedPolicy> {
  // Get plan policy
  const planPolicy = await queryOne<PlanPolicy>(
    "SELECT * FROM plan_policies WHERE plan_key = $1",
    [plan]
  );

  if (!planPolicy) {
    throw new Error(`Unknown plan: ${plan}`);
  }

  // If no workspace, return plan policy as-is
  if (!workspaceId) {
    return {
      social_accounts_limit: planPolicy.social_accounts_limit,
      allow_scheduled_refresh: planPolicy.allow_scheduled_refresh,
      allow_oauth: planPolicy.allow_oauth,
      default_refresh_interval_hours: planPolicy.default_refresh_interval_hours,
    };
  }

  // Get workspace override if exists
  const override = await queryOne<WorkspacePolicyOverride>(
    "SELECT * FROM workspace_policy_overrides WHERE workspace_id = $1",
    [workspaceId]
  );

  // Cascade: override value || plan value
  return {
    social_accounts_limit:
      override?.social_accounts_limit ?? planPolicy.social_accounts_limit,
    allow_scheduled_refresh:
      override?.allow_scheduled_refresh ?? planPolicy.allow_scheduled_refresh,
    allow_oauth: override?.allow_oauth ?? planPolicy.allow_oauth,
    default_refresh_interval_hours: planPolicy.default_refresh_interval_hours,
  };
}

// Convenience function to get policy for a user
export async function getUserPolicy(
  userId: string,
  plan: string,
  workspaceId?: string
): Promise<ResolvedPolicy> {
  return resolvePolicy(plan, workspaceId);
}

// Check if feature is allowed for user
export async function isFeatureAllowed(
  feature: "scheduled_refresh" | "oauth",
  plan: string,
  workspaceId?: string
): Promise<boolean> {
  const policy = await resolvePolicy(plan, workspaceId);

  switch (feature) {
    case "scheduled_refresh":
      return policy.allow_scheduled_refresh;
    case "oauth":
      return policy.allow_oauth;
    default:
      return false;
  }
}
