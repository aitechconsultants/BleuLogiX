import { RequestHandler } from "express";
import { upsertUser } from "../users";
import { logError } from "../logging";

export const handleSync: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const auth = (req as any).auth;

  try {
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        correlationId,
      });
    }

    // Upsert user in database
    const user = await upsertUser(auth.clerkUserId, auth.email);

    res.json({
      userId: user.id,
      clerkUserId: user.clerk_user_id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to sync user",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to sync user",
      correlationId,
    });
  }
};

/**
 * Debug endpoint - only enabled in development or with ADMIN_TOKEN
 * Returns basic auth info for troubleshooting
 */
export const handleAuthDebug: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const auth = (req as any).auth;

  // Check if debug is allowed
  const isDevEnv = process.env.NODE_ENV !== "production";
  const hasAdminToken =
    process.env.ADMIN_TOKEN && req.query.token === process.env.ADMIN_TOKEN;

  if (!isDevEnv && !hasAdminToken) {
    return res.status(403).json({
      error: "Debug endpoint not available in production",
      correlationId,
    });
  }

  try {
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
        correlationId,
      });
    }

    res.json({
      ok: true,
      userId: auth.clerkUserId,
      email: auth.email,
      timestamp: new Date().toISOString(),
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Debug endpoint error",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      ok: false,
      error: "Debug check failed",
      correlationId,
    });
  }
};
