import { RequestHandler } from "express";
import { queryOne, queryAll, query } from "../db";
import { logError } from "../logging";
import { getPlatformAdapter, Platform } from "../services/platforms";

interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  username: string;
  profile_url: string;
  is_verified?: boolean;
  follower_count: number;
  following_count?: number;
  post_count: number;
  engagement_rate?: number;
  last_synced_at?: string;
  status: "active" | "error" | "paused";
  created_at: string;
  updated_at: string;
}

// Helper: Get user's subscription plan
async function getUserPlan(
  userId: string,
): Promise<"free" | "pro" | "enterprise"> {
  const sub = await queryOne<{ plan: string }>(
    "SELECT plan FROM subscriptions WHERE user_id = $1",
    [userId],
  );
  return (sub?.plan as any) || "free";
}

// Helper: Get account limits based on plan
function getAccountLimits(plan: string): number {
  switch (plan) {
    case "pro":
      return 5;
    case "enterprise":
      return 999; // Unlimited in practice
    case "free":
    default:
      return 1;
  }
}

// Helper: Get user's current account count
async function getUserAccountCount(userId: string): Promise<number> {
  const result = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM social_accounts WHERE user_id = $1 AND status != 'error'",
    [userId],
  );
  return result?.count || 0;
}

// Add Account
export const handleAddAccount: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    const { platform, username } = req.body;

    // Validate input
    if (!platform || !username) {
      return res.status(400).json({
        error: "Platform and username are required",
        correlationId,
      });
    }

    // Validate platform exists
    let adapter;
    try {
      adapter = getPlatformAdapter(platform);
    } catch (error) {
      return res.status(400).json({
        error: `Invalid platform: ${platform}`,
        correlationId,
      });
    }

    // Validate username format
    if (!adapter.validateUsername(username)) {
      return res.status(400).json({
        error: `Invalid username format for ${platform}`,
        correlationId,
      });
    }

    // Check feature gating
    const plan = await getUserPlan(userId);
    const limit = getAccountLimits(plan);
    const currentCount = await getUserAccountCount(userId);

    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Account limit (${limit}) reached for ${plan} plan`,
        correlationId,
      });
    }

    // Check for duplicate account
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM social_accounts WHERE user_id = $1 AND platform = $2 AND username = $3",
      [userId, platform, username],
    );

    if (existing) {
      return res.status(409).json({
        error: "This account is already connected",
        correlationId,
      });
    }

    // Get profile data
    const profileUrl = adapter.getProfileUrl(username);
    let metrics;
    let status = "active";

    try {
      metrics = await adapter.fetchMetrics(username);
    } catch (error) {
      logError(
        { correlationId, userId },
        `Failed to fetch metrics for ${platform}/${username}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      status = "error";
      metrics = {
        follower_count: 0,
        post_count: 0,
        profile_url: profileUrl,
      };
    }

    // Insert account
    const result = await query<SocialAccount>(
      `INSERT INTO social_accounts (
        user_id, platform, username, profile_url, follower_count, post_count,
        engagement_rate, is_verified, last_synced_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING *`,
      [
        userId,
        platform,
        username,
        metrics.profile_url,
        metrics.follower_count,
        metrics.post_count,
        metrics.engagement_rate || null,
        metrics.is_verified || false,
        status,
      ],
    );

    const account = result.rows[0];

    // Create initial metrics snapshot
    if (status === "active") {
      await query(
        `INSERT INTO social_metrics_snapshots (
          social_account_id, followers, likes, comments, engagement_rate
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          account.id,
          metrics.follower_count,
          0,
          0,
          metrics.engagement_rate || null,
        ],
      );
    }

    return res.status(201).json({
      success: true,
      account,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId: (req as any).auth?.userId },
      "Failed to add social account",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to add account",
      correlationId,
    });
  }
};

// List Accounts
export const handleListAccounts: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    const accounts = await queryAll<SocialAccount>(
      `SELECT * FROM social_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );

    const plan = await getUserPlan(userId);
    const limit = getAccountLimits(plan);

    return res.json({
      accounts,
      plan,
      accountLimit: limit,
      accountCount: accounts.length,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId },
      "Failed to list accounts",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch accounts",
      correlationId,
    });
  }
};

// Refresh Account Data
export const handleRefreshAccount: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const accountId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    // Get account
    const account = await queryOne<SocialAccount>(
      "SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2",
      [accountId, userId],
    );

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        correlationId,
      });
    }

    // Get adapter and fetch new metrics
    const adapter = getPlatformAdapter(account.platform);
    let metrics;
    let newStatus = "active";

    try {
      metrics = await adapter.fetchMetrics(account.username);
    } catch (error) {
      logError(
        { correlationId, userId, accountId },
        `Refresh failed for ${account.platform}/${account.username}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      newStatus = "error";
      metrics = {
        follower_count: account.follower_count,
        post_count: account.post_count,
        profile_url: account.profile_url,
      };
    }

    // Update account
    const result = await query<SocialAccount>(
      `UPDATE social_accounts SET
        follower_count = $1,
        post_count = $2,
        engagement_rate = $3,
        is_verified = $4,
        status = $5,
        last_synced_at = NOW()
      WHERE id = $6
      RETURNING *`,
      [
        metrics.follower_count,
        metrics.post_count,
        metrics.engagement_rate || null,
        metrics.is_verified || false,
        newStatus,
        accountId,
      ],
    );

    const updatedAccount = result.rows[0];

    // Create metrics snapshot
    if (newStatus === "active") {
      await query(
        `INSERT INTO social_metrics_snapshots (
          social_account_id, followers, engagement_rate, captured_at
        ) VALUES ($1, $2, $3, NOW())`,
        [accountId, metrics.follower_count, metrics.engagement_rate || null],
      );
    }

    return res.json({
      success: true,
      account: updatedAccount,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId, accountId },
      "Failed to refresh account",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to refresh account",
      correlationId,
    });
  }
};

// Remove Account
export const handleRemoveAccount: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const accountId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    // Verify ownership
    const account = await queryOne<{ id: string }>(
      "SELECT id FROM social_accounts WHERE id = $1 AND user_id = $2",
      [accountId, userId],
    );

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        correlationId,
      });
    }

    // Delete account (cascade deletes snapshots)
    await query("DELETE FROM social_accounts WHERE id = $1", [accountId]);

    return res.json({
      success: true,
      message: "Account removed",
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId, accountId },
      "Failed to remove account",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to remove account",
      correlationId,
    });
  }
};

// Module 2A: Update Refresh Settings
export const handleUpdateRefreshSettings: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const accountId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    const { refresh_mode, refresh_interval_hours } = req.body;

    // Verify ownership
    const account = await queryOne<SocialAccount>(
      "SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2",
      [accountId, userId],
    );

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        correlationId,
      });
    }

    // Validate input
    if (refresh_mode && !["manual", "scheduled"].includes(refresh_mode)) {
      return res.status(400).json({
        error: "Invalid refresh_mode",
        correlationId,
      });
    }

    if (
      refresh_interval_hours &&
      (refresh_interval_hours < 1 || refresh_interval_hours > 168)
    ) {
      return res.status(400).json({
        error: "refresh_interval_hours must be between 1 and 168",
        correlationId,
      });
    }

    // Check feature gating: only Pro+ can schedule
    if (refresh_mode === "scheduled") {
      const plan = await getUserPlan(userId);
      if (plan === "free") {
        return res.status(403).json({
          error: "Scheduled refresh requires Pro or Enterprise plan",
          correlationId,
        });
      }
    }

    // Calculate next refresh time if switching to scheduled
    let nextRefreshAt = account.next_refresh_at;
    if (refresh_mode === "scheduled" && account.refresh_mode === "manual") {
      nextRefreshAt = new Date().toISOString();
    } else if (refresh_mode === "manual") {
      nextRefreshAt = null;
    }

    const result = await query<SocialAccount>(
      `UPDATE social_accounts SET
        refresh_mode = COALESCE($1, refresh_mode),
        refresh_interval_hours = COALESCE($2, refresh_interval_hours),
        next_refresh_at = COALESCE($3, next_refresh_at),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
      [
        refresh_mode || null,
        refresh_interval_hours || null,
        nextRefreshAt,
        accountId,
      ],
    );

    return res.json({
      success: true,
      account: result.rows[0],
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId, accountId },
      "Failed to update refresh settings",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to update refresh settings",
      correlationId,
    });
  }
};

// Module 2A: Trigger one refresh cycle (admin/dev only)
export const handleRunRefreshCycle: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  // Simple admin check: only allow if ADMIN_TOKEN matches or is in dev mode
  const adminToken = req.headers["x-admin-token"];
  const expectedToken = process.env.ADMIN_TOKEN;

  if (expectedToken && adminToken !== expectedToken) {
    return res.status(403).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  try {
    // Import here to avoid circular dependency
    const { runRefreshCycle } = await import("../services/refreshWorker");
    await runRefreshCycle();

    return res.json({
      success: true,
      message: "Refresh cycle completed",
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to run refresh cycle",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to run refresh cycle",
      correlationId,
    });
  }
};
