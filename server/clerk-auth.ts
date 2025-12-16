import { RequestHandler } from "express";
import { createCorrelationId, logAuthError } from "./logging";

export interface ClerkAuth {
  clerkUserId: string;
  email?: string;
  correlationId: string;
}

/**
 * Middleware to verify Clerk auth info set by clerkMiddleware
 * Requires clerkMiddleware to be applied first in the Express app
 */
export const requireClerkAuth: RequestHandler = (req, res, next) => {
  const correlationId = createCorrelationId();
  (req as any).correlationId = correlationId;

  try {
    const auth = (req as any).auth;

    if (!auth || !auth.userId) {
      logAuthError(correlationId, "Invalid token - missing userId");
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    // Get email from user metadata or use a default format
    const email = auth.sessionClaims?.email || `${auth.userId}@clerk.invalid`;

    // Attach auth info to request in the format expected by route handlers
    (req as any).auth = {
      clerkUserId: auth.userId,
      email,
      correlationId,
    } as ClerkAuth;

    next();
  } catch (error) {
    logAuthError(
      correlationId,
      "Clerk authentication verification failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(401).json({
      error: "Unauthorized - authentication failed",
      correlationId,
    });
  }
};
