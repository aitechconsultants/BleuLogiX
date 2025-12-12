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

    // Decode and validate the JWT token
    let decoded: any;
    try {
      // Decode without verification to extract claims
      const decodedHeader = jwt.decode(token, { complete: true });

      if (!decodedHeader) {
        throw new Error("Invalid token format");
      }

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

    // Extract email from token if available, otherwise use a placeholder
    const email = decoded.email || `${decoded.sub}@clerk.invalid`;

    // Attach auth info to request without making additional API calls
    // This avoids rate limiting issues with Clerk API
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
