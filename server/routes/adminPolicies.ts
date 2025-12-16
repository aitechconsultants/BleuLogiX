import { RequestHandler } from "express";
import { queryAll, queryOne, query } from "../db";
import { logError } from "../logging";

interface PlanPolicy {
  plan_key: string;
  social_accounts_limit: number;
  allow_scheduled_refresh: boolean;
  allow_oauth: boolean;
  default_refresh_interval_hours: number;
  updated_at: string;
}

interface WorkspacePolicyOverride {
  workspace_id: string;
  social_accounts_limit?: number;
  allow_scheduled_refresh?: boolean;
  allow_oauth?: boolean;
  updated_at: string;
}

// Module 2C: Get all plan policies
export const handleGetPlanPolicies: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const policies = await queryAll<PlanPolicy>(
      "SELECT * FROM plan_policies ORDER BY plan_key ASC",
      [],
    );

    return res.json({
      policies,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to fetch plan policies",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch policies",
      correlationId,
    });
  }
};

// Module 2C: Update plan policy
export const handleUpdatePlanPolicy: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { plan_key } = req.params;

  try {
    const {
      social_accounts_limit,
      allow_scheduled_refresh,
      allow_oauth,
      default_refresh_interval_hours,
    } = req.body;

    // Validate input
    if (
      social_accounts_limit !== undefined &&
      (social_accounts_limit < 1 || social_accounts_limit > 999)
    ) {
      return res.status(400).json({
        error: "social_accounts_limit must be between 1 and 999",
        correlationId,
      });
    }

    if (
      default_refresh_interval_hours !== undefined &&
      (default_refresh_interval_hours < 1 ||
        default_refresh_interval_hours > 168)
    ) {
      return res.status(400).json({
        error: "default_refresh_interval_hours must be between 1 and 168",
        correlationId,
      });
    }

    // Update policy
    const result = await query<PlanPolicy>(
      `UPDATE plan_policies SET
        social_accounts_limit = COALESCE($1, social_accounts_limit),
        allow_scheduled_refresh = COALESCE($2, allow_scheduled_refresh),
        allow_oauth = COALESCE($3, allow_oauth),
        default_refresh_interval_hours = COALESCE($4, default_refresh_interval_hours),
        updated_at = NOW()
      WHERE plan_key = $5
      RETURNING *`,
      [
        social_accounts_limit ?? null,
        allow_scheduled_refresh ?? null,
        allow_oauth ?? null,
        default_refresh_interval_hours ?? null,
        plan_key,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Plan not found",
        correlationId,
      });
    }

    return res.json({
      policy: result.rows[0],
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, plan_key },
      "Failed to update plan policy",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to update policy",
      correlationId,
    });
  }
};

// Module 2C: Get workspace overrides
export const handleGetWorkspaceOverrides: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { workspace_id } = req.query;

  try {
    let query_text = "SELECT * FROM workspace_policy_overrides";
    const params: any[] = [];

    if (workspace_id) {
      query_text += " WHERE workspace_id = $1";
      params.push(workspace_id);
    }

    query_text += " ORDER BY updated_at DESC";

    const overrides = await queryAll<WorkspacePolicyOverride>(
      query_text,
      params,
    );

    return res.json({
      overrides,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to fetch workspace overrides",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch overrides",
      correlationId,
    });
  }
};

// Module 2C: Create or update workspace override
export const handleUpdateWorkspaceOverride: RequestHandler = async (
  req,
  res,
) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { workspace_id } = req.params;

  try {
    const { social_accounts_limit, allow_scheduled_refresh, allow_oauth } =
      req.body;

    if (!workspace_id) {
      return res.status(400).json({
        error: "workspace_id is required",
        correlationId,
      });
    }

    // Validate input
    if (
      social_accounts_limit !== undefined &&
      (social_accounts_limit < 1 || social_accounts_limit > 999)
    ) {
      return res.status(400).json({
        error: "social_accounts_limit must be between 1 and 999",
        correlationId,
      });
    }

    // Upsert override
    const result = await query<WorkspacePolicyOverride>(
      `INSERT INTO workspace_policy_overrides (workspace_id, social_accounts_limit, allow_scheduled_refresh, allow_oauth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (workspace_id) DO UPDATE SET
        social_accounts_limit = COALESCE(EXCLUDED.social_accounts_limit, workspace_policy_overrides.social_accounts_limit),
        allow_scheduled_refresh = COALESCE(EXCLUDED.allow_scheduled_refresh, workspace_policy_overrides.allow_scheduled_refresh),
        allow_oauth = COALESCE(EXCLUDED.allow_oauth, workspace_policy_overrides.allow_oauth),
        updated_at = NOW()
      RETURNING *`,
      [
        workspace_id,
        social_accounts_limit ?? null,
        allow_scheduled_refresh ?? null,
        allow_oauth ?? null,
      ],
    );

    return res.json({
      override: result.rows[0],
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, workspace_id },
      "Failed to update workspace override",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to update override",
      correlationId,
    });
  }
};

// Module 2C: Delete workspace override (revert to plan defaults)
export const handleDeleteWorkspaceOverride: RequestHandler = async (
  req,
  res,
) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { workspace_id } = req.params;

  try {
    await query(
      "DELETE FROM workspace_policy_overrides WHERE workspace_id = $1",
      [workspace_id],
    );

    return res.json({
      success: true,
      message: "Workspace override deleted",
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, workspace_id },
      "Failed to delete workspace override",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to delete override",
      correlationId,
    });
  }
};
