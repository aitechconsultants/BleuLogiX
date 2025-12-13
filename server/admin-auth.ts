import { RequestHandler } from "express";
import { ClerkAuth } from "./clerk-auth";
import { getUserByClerkId } from "./users";
import { logAuthError } from "./logging";

/**
 * Middleware to check if authenticated user is an admin
 * Must be used after requireClerkAuth middleware
 */
export const requireAdminAuth: RequestHandler = async (req, res, next) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const auth = (req as any).auth as ClerkAuth | undefined;

    if (!auth || !auth.clerkUserId) {
      logAuthError(
        correlationId,
        "Admin access requested without authentication"
      );
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    // Fetch user from database to check role
    const user = await getUserByClerkId(auth.clerkUserId);

    if (!user) {
      logAuthError(
        correlationId,
        "Admin access requested for non-existent user",
        undefined,
        { clerkUserId: auth.clerkUserId }
      );
      return res.status(403).json({
        error: "Forbidden - user not found",
        correlationId,
      });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      logAuthError(
        correlationId,
        "Admin access requested by non-admin user",
        undefined,
        { clerkUserId: auth.clerkUserId, role: user.role }
      );
      return res.status(403).json({
        error: "Forbidden - admin access required",
        correlationId,
      });
    }

    // Attach user info to request
    (req as any).user = user;
    next();
  } catch (error) {
    logAuthError(
      correlationId,
      "Admin authentication verification failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal server error",
      correlationId,
    });
  }
};
