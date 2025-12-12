import { RequestHandler } from "express";
import { createClerkClient, verifyToken } from "@clerk/clerk-sdk-node";
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
 * Middleware to verify Clerk token and extract user information
 * Expects Authorization: Bearer <token> where token is a Clerk session token
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

    // Verify the token with Clerk
    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!decoded || !decoded.sub) {
      logAuthError(
        correlationId,
        "Invalid or expired Clerk token"
      );
      return res.status(401).json({
        error: "Unauthorized - invalid token",
        correlationId,
      });
    }

    // Fetch the user to get email
    const user = await clerkClient.users.getUser(decoded.sub);

    if (!user) {
      logAuthError(
        correlationId,
        "Clerk user not found",
        { clerkUserId: decoded.sub }
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
      clerkUserId: decoded.sub,
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
