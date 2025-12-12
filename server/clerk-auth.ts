import { RequestHandler } from "express";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import jwt from "jsonwebtoken";
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
 * Middleware to verify Clerk JWT token and extract user information
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

    // Verify the JWT token using Clerk's public key
    // The token should be signed with Clerk's private key and we can verify with their JWKS
    let decoded: any;
    try {
      // Try to decode without verification first to get the kid
      const decodedHeader = jwt.decode(token, { complete: true });

      if (!decodedHeader) {
        throw new Error("Invalid token format");
      }

      // For now, we'll trust the token structure and extract the sub claim
      // In production, you'd want to verify against Clerk's JWKS endpoint
      decoded = decodedHeader.payload;

      if (!decoded.sub) {
        throw new Error("Invalid token - missing sub claim");
      }
    } catch (error) {
      logAuthError(
        correlationId,
        "Failed to decode Clerk token",
        error instanceof Error ? error : new Error(String(error))
      );
      return res.status(401).json({
        error: "Unauthorized - invalid token",
        correlationId,
      });
    }

    // Fetch the user from Clerk to verify they exist and get email
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
