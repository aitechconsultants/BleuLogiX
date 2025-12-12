import { RequestHandler } from "express";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { createCorrelationId, logAuthError } from "./logging";

// Validate required environment variable
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY environment variable is required");
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface ClerkAuth {
  clerkUserId: string;
  email?: string;
  correlationId: string;
}

/**
 * Middleware to verify Clerk JWT token using official Clerk SDK
 * Expects Authorization: Bearer <token> where token is a Clerk JWT token
 */
export const requireClerkAuth: RequestHandler = async (req, res, next) => {
  const correlationId = createCorrelationId();
  (req as any).correlationId = correlationId;

  try {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logAuthError(
        correlationId,
        "Missing Clerk authentication token"
      );
      return res.status(401).json({
        error: "Unauthorized - missing authentication token",
        correlationId,
      });
    }

    const token = authHeader.slice(7);

    // Verify the token using Clerk's official SDK method
    let session: any;
    try {
      session = await clerkClient.verifyToken(token);
    } catch (error) {
      logAuthError(
        correlationId,
        "Clerk token verification failed",
        error instanceof Error ? error : new Error(String(error))
      );
      return res.status(401).json({
        error: "Unauthorized - invalid or expired token",
        correlationId,
      });
    }

    if (!session || !session.sub) {
      logAuthError(
        correlationId,
        "Invalid token - missing sub claim"
      );
      return res.status(401).json({
        error: "Unauthorized - invalid token",
        correlationId,
      });
    }

    // Extract email from session if available
    const email = session.email || `${session.sub}@clerk.invalid`;

    // Attach auth info to request
    (req as any).auth = {
      clerkUserId: session.sub,
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
