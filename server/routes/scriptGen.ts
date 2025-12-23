import { RequestHandler, Router } from "express";
import { z } from "zod";
import {
  getScriptGenService,
  type GenerateScriptInput,
} from "../services/scriptGen";
import { logError } from "../logging";
import { queryOne, query } from "../db";

const scriptGenRouter = Router();

const GenerateScriptRequestSchema = z.object({
  videoTopic: z.string().min(1).max(500),
  niche: z.string().min(1).max(200).optional(),
  styleTone: z.string().min(1).max(200).optional(),
  maxChars: z.number().min(100).max(2000).optional(),
});

type GenerateScriptRequest = z.infer<typeof GenerateScriptRequestSchema>;

export const handleScriptGenHealth: RequestHandler = (req, res) => {
  res.json({ ok: true, service: "script-gen" });
};

export const handleScriptGenDebug: RequestHandler = async (req, res) => {
  const service = getScriptGenService();
  const openaiHealthy = await service.checkOpenAIHealth();

  res.json({
    service: "script-gen",
    openai_healthy: openaiHealthy,
    openai_key_set: !!process.env.OPENAI_API_KEY,
    script_gen_model: process.env.SCRIPT_GEN_MODEL || "gpt-4-mini",
    script_gen_enable_mock: process.env.SCRIPT_GEN_ENABLE_MOCK || "false",
  });
};

async function getOrCreateUser(clerkUserId: string): Promise<string> {
  // Get or create user in users table
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE clerk_user_id = $1",
    [clerkUserId],
  );

  if (existing) {
    return existing.id;
  }

  const result = await query<{ id: string }>(
    "INSERT INTO users (clerk_user_id) VALUES ($1) RETURNING id",
    [clerkUserId],
  );

  return result.rows[0]!.id;
}

async function getOrCreateSubscription(
  userId: string,
): Promise<{ plan: "free" | "pro" | "enterprise"; id: string }> {
  const existing = await queryOne<{
    id: string;
    plan: "free" | "pro" | "enterprise";
  }>("SELECT id, plan FROM subscriptions WHERE user_id = $1", [userId]);

  if (existing) {
    return existing;
  }

  const result = await query<{
    id: string;
    plan: "free" | "pro" | "enterprise";
  }>(
    `INSERT INTO subscriptions (user_id, plan, status)
     VALUES ($1, 'free', 'active')
     RETURNING id, plan`,
    [userId],
  );

  const subscription = result.rows[0]!;

  // Grant welcome bonus credits to new free users
  const initialCredits = 50;
  await query(
    `INSERT INTO credit_ledger (user_id, delta, reason)
     VALUES ($1, $2, $3)`,
    [userId, initialCredits, "Welcome bonus for new users"],
  );

  return subscription;
}

async function getCreditsRemaining(userId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
    [userId],
  );
  return result?.total ?? 0;
}

async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await query(
    `INSERT INTO credit_ledger (user_id, delta, reason)
     VALUES ($1, $2, $3)`,
    [userId, -amount, reason],
  );
}

export const handleGenerateScript: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    // Check DB readiness before any database operations
    const dbReady = (req.app?.locals?.dbReady ?? false) as boolean;
    if (!dbReady) {
      return res.status(503).json({
        ok: false,
        success: false,
        error: "Database unavailable",
        correlationId,
      });
    }

    const auth = (req as any).auth;
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        ok: false,
        error: "unauthorized",
        correlationId,
      });
    }

    let payload: GenerateScriptRequest;
    try {
      payload = GenerateScriptRequestSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: "invalid_request",
          details: validationError.errors,
          correlationId,
        });
      }
      throw validationError;
    }

    // Convert Clerk user ID to UUID
    const userId = await getOrCreateUser(auth.clerkUserId);
    const sub = await getOrCreateSubscription(userId);
    const creditsRemaining = await getCreditsRemaining(userId);
    const creditCost = 10;

    if (creditsRemaining < creditCost) {
      return res.status(403).json({
        ok: false,
        error: "upgrade_required",
        message: `Insufficient credits. Required: ${creditCost}, Available: ${creditsRemaining}`,
        correlationId,
      });
    }

    const service = getScriptGenService();

    try {
      const script = await service.generateScript(
        userId,
        payload as GenerateScriptInput,
        correlationId,
      );

      await deductCredits(userId, creditCost, "Script generation");

      res.json({
        ok: true,
        success: true,
        script,
        creditsRemaining: creditsRemaining - creditCost,
        correlationId,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg === "server_misconfigured") {
        return res.status(500).json({
          ok: false,
          error: "server_misconfigured",
          correlationId,
        });
      }

      throw error;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Log only correlationId and error code, never auth tokens or request body
    logError(
      { correlationId },
      `Script generation failed: ${errorMsg.substring(0, 100)}`,
    );

    if (errorMsg.includes("timeout")) {
      return res.status(504).json({
        ok: false,
        success: false,
        error: "timeout",
        correlationId,
      });
    }

    // Default to 500 on uncaught errors
    res.status(500).json({
      ok: false,
      success: false,
      error: "Internal server error",
      correlationId,
    });
  }
};

scriptGenRouter.get("/health", handleScriptGenHealth);
scriptGenRouter.post("/generate", handleGenerateScript);

export { scriptGenRouter };
