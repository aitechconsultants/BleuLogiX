import { RequestHandler } from "express";
import { requireAuth } from "@clerk/express";
import { createCorrelationId, logAuthError } from "./logging";

export interface ClerkAuth {
  clerkUserId: string;
  email?: string;
  correlationId: string;
}

/**
 * Middleware to verify Clerk JWT token using @clerk/express
 * Expects Authorization: Bearer <token> where token is a Clerk JWT token
 */
export const requireClerkAuth: RequestHandler = async (req, res, next) => {
  const correlationId = createCorrelationId();
  (req as any).correlationId = correlationId;

  try {
    // Use @clerk/express requireAuth middleware to verify token
    await requireAuth()(req, res, () => {
      // Extract user info from Clerk's auth object
      const auth = (req as any).auth;
      
      if (!auth || !auth.userId) {
        logAuthError(
          correlationId,
          "Invalid token - missing userId"
        );
        return res.status(401).json({
          error: "Unauthorized - invalid token",
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
    });
  } catch (error) {
    logAuthError(
      correlationId,
      "Clerk authentication verification failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(401).json({
      error: "Unauthorized - authentication failed",
      correlationId,
    });
  }
};
