import { RequestHandler } from "express";
import { logError } from "../logging";
import { z } from "zod";
import { queryOne, query } from "../db";

interface GenerateScriptRequest {
  videoTopic: string;
  niche?: string;
  styleTone?: string;
  maxChars?: number;
}

interface GenerateScriptResponse {
  script: string;
}

const GenerateScriptSchema = z.object({
  videoTopic: z.string().min(1).max(500),
  niche: z.string().min(1).max(200).optional(),
  styleTone: z.string().min(1).max(200).optional(),
  maxChars: z.number().min(100).max(2000).optional(),
});

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

  return result.rows[0]!;
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
    const auth = (req as any).auth;
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    let payload: GenerateScriptRequest;
    try {
      payload = GenerateScriptSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request payload",
          details: validationError.errors,
          correlationId,
        });
      }
      throw validationError;
    }

    if (!payload.videoTopic) {
      return res.status(400).json({ error: "Missing required field: videoTopic" });
    }

    const sub = await getOrCreateSubscription(auth.clerkUserId);
    const creditsRemaining = await getCreditsRemaining(auth.clerkUserId);
    const creditCost = 10;

    if (creditsRemaining < creditCost) {
      return res.status(403).json({
        error: "upgrade_required",
        message: `Insufficient credits. Required: ${creditCost}, Available: ${creditsRemaining}`,
        correlationId,
      });
    }

    const SCRIPT_URL = process.env.SCRIPT_GEN_URL;
    const SCRIPT_TOKEN = process.env.SCRIPT_GEN_TOKEN;

    if (!SCRIPT_URL || !SCRIPT_TOKEN) {
      return res.status(500).json({
        error: "server_misconfigured",
        correlationId,
      });
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-script-gen-token": SCRIPT_TOKEN,
      },
      body: JSON.stringify({
        videoTopic: payload.videoTopic,
        niche: payload.niche || "General",
        styleTone: payload.styleTone || "Professional",
        maxChars: payload.maxChars || 2000,
      }),
    });

    if (!response.ok) {
      logError(
        { correlationId, userId: auth.clerkUserId },
        `Pipedream returned ${response.status}: ${response.statusText}`,
      );
      return res.status(502).json({
        error: "generation_failed",
        correlationId,
      });
    }

    const data = await response.json().catch(() => ({}));
    const script = data.script || data.text;

    if (!script) {
      return res.status(502).json({ error: "No script returned" });
    }

    await deductCredits(auth.clerkUserId, creditCost, "Script generation");

    return res.json({
      script,
      creditsRemaining: creditsRemaining - creditCost,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logError(
      { correlationId },
      "Script generation request failed",
      err instanceof Error ? err : new Error(errorMsg),
    );
    return res.status(500).json({
      error: "Internal script generation error",
      correlationId,
    });
  }
};
