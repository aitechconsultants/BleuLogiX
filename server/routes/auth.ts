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
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: "Failed to sync user",
      correlationId,
    });
  }
};
