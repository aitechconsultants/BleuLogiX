import { RequestHandler } from "express";
import {
  getAllUsers,
  updateUserRole,
  setPlanOverride,
  clearPlanOverride,
  calculateEffectivePlan,
  User,
} from "../users";
import { logError } from "../logging";
import { query, queryOne } from "../db";

// Get all users (admin only)
export const handleGetAllUsers: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await getAllUsers(limit, offset);

    // Calculate effective plans for each user
    const usersWithEffectivePlan = users.map((user) => ({
      ...user,
      effective_plan_calculated: calculateEffectivePlan(user),
    }));

    return res.json({
      users: usersWithEffectivePlan,
      limit,
      offset,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to fetch users",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to fetch users",
      correlationId,
    });
  }
};

// Update user role
export const handleUpdateUserRole: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        error: "userId and role are required",
        correlationId,
      });
    }

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be user, admin, or superadmin",
        correlationId,
      });
    }

    const updatedUser = await updateUserRole(userId, role);

    return res.json({
      user: {
        ...updatedUser,
        effective_plan_calculated: calculateEffectivePlan(updatedUser),
      },
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to update user role",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to update user role",
      correlationId,
    });
  }
};

// Set plan override
export const handleSetPlanOverride: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { userId, plan, expiresAt, reason } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({
        error: "userId and plan are required",
        correlationId,
      });
    }

    if (!["free", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan. Must be free, pro, or enterprise",
        correlationId,
      });
    }

    // Validate expiration date if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          error: "Invalid expiresAt format",
          correlationId,
        });
      }
    }

    const updatedUser = await setPlanOverride(userId, plan, expiresAt, reason);

    return res.json({
      user: {
        ...updatedUser,
        effective_plan_calculated: calculateEffectivePlan(updatedUser),
      },
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to set plan override",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to set plan override",
      correlationId,
    });
  }
};

// Clear plan override
export const handleClearPlanOverride: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
        correlationId,
      });
    }

    const updatedUser = await clearPlanOverride(userId);

    return res.json({
      user: {
        ...updatedUser,
        effective_plan_calculated: calculateEffectivePlan(updatedUser),
      },
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to clear plan override",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to clear plan override",
      correlationId,
    });
  }
};

// Grant credits to a user (admin only)
export const handleGrantCredits: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        error: "userId and amount are required",
        correlationId,
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        error: "amount must be a positive number",
        correlationId,
      });
    }

    // Verify user exists
    const user = await queryOne<{ id: string; clerk_user_id: string }>(
      "SELECT id, clerk_user_id FROM users WHERE id = $1",
      [userId],
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        correlationId,
      });
    }

    // Add credits to ledger
    await query(
      `INSERT INTO credit_ledger (user_id, delta, reason)
       VALUES ($1, $2, $3)`,
      [userId, amount, reason || "Admin grant"],
    );

    // Get updated balance
    const result = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
      [userId],
    );

    return res.json({
      user_id: userId,
      amount_granted: amount,
      new_balance: result?.total ?? 0,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to grant credits",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to grant credits",
      correlationId,
    });
  }
};

// Grant credits to current user (admin only)
export const handleGrantCreditsToSelf: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { amount, reason } = req.body;
    const clerkUserId = (req as any).auth?.clerkUserId;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Not authenticated",
        correlationId,
      });
    }

    if (!amount) {
      return res.status(400).json({
        error: "amount is required",
        correlationId,
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        error: "amount must be a positive number",
        correlationId,
      });
    }

    // Get or create user
    let user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE clerk_user_id = $1",
      [clerkUserId],
    );

    if (!user) {
      const result = await query<{ id: string }>(
        "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
        [clerkUserId],
      );
      user = result.rows[0];
    }

    // Add credits to ledger
    await query(
      `INSERT INTO credit_ledger (user_id, delta, reason)
       VALUES ($1, $2, $3)`,
      [user!.id, amount, reason || "Admin self-grant"],
    );

    // Get updated balance
    const result = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
      [user!.id],
    );

    return res.json({
      user_id: user!.id,
      clerk_user_id: clerkUserId,
      amount_granted: amount,
      new_balance: result?.total ?? 0,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to grant credits to self",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({
      error: "Failed to grant credits",
      correlationId,
    });
  }
};
