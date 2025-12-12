import { RequestHandler } from "express";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { createCorrelationId, logAuthError } from "./logging";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface ClerkAuth {
  clerkUserId: string;
  email?: string;
  correlationId: string;
}

/**
 * Middleware to verify Clerk session and extract user information
 * Supports both Authorization Bearer tokens and Clerk session cookies
 */
export const requireClerkAuth: RequestHandler = async (req, res, next) => {
  const correlationId = createCorrelationId();
  (req as any).correlationId = correlationId;

  try {
    // Get token from Authorization header (Bearer <token>)
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    if (!token) {
      logAuthError(
        correlationId,
        "Missing Clerk authentication token"
      );
      return res.status(401).json({
        error: "Unauthorized - missing authentication token",
        correlationId,
      });
    }

    // Verify the token with Clerk
    const session = await clerkClient.sessions.getSession(token);

    if (!session || !session.userId) {
      logAuthError(
        correlationId,
        "Invalid or expired Clerk session token"
      );
      return res.status(401).json({
        error: "Unauthorized - invalid session",
        correlationId,
      });
    }

    // Fetch the user to get email
    const user = await clerkClient.users.getUser(session.userId);

    if (!user) {
      logAuthError(
        correlationId,
        "Clerk user not found",
        { clerkUserId: session.userId }
      );
      return res.status(401).json({
        error: "Unauthorized - user not found",
        correlationId,
      });
    }

    // Extract email from user
    const email = user.emailAddresses[0]?.emailAddress;

    // Attach auth info to request
    (req as any).auth = {
      clerkUserId: session.userId,
      email,
      correlationId,
    } as ClerkAuth;

    next();
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
