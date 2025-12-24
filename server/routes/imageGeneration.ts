import { RequestHandler } from "express";
import { ImageGenerationService } from "../services/imageGenerationService";
import { queryOne, query } from "../db";
import { logError } from "../logging";
import { upsertUser } from "../users";

interface CreditsResult {
  total: number;
}

const imageGenService = new ImageGenerationService();

async function getCreditsRemaining(userId: string): Promise<number> {
  const result = await queryOne<CreditsResult>(
    `SELECT COALESCE(SUM(delta), 0) as total
     FROM credit_ledger
     WHERE user_id = $1`,
    [userId],
  );
  return result?.total || 0;
}

export const handleGenerateImages: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const auth = (req as any).auth;
  const clerkUserId = auth?.clerkUserId;
  const { script, episodes, imageStyle } = req.body;

  if (!clerkUserId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  if (!script || typeof script !== "string" || script.trim().length === 0) {
    return res.status(400).json({
      error: "Script is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[imageGen] POST /api/images/generate - clerkUserId: ${clerkUserId}, script length: ${script.length}, episodes: ${(episodes || []).length}, correlationId: ${correlationId}`,
    );

    const user = await upsertUser(clerkUserId, auth?.email);
    const userId = user.id;

    const creditsRemaining = await getCreditsRemaining(userId);
    console.log(
      `[imageGen] User ${clerkUserId} has ${creditsRemaining} credits remaining`,
    );

    const result = await imageGenService.generateImagesFromScript(
      script,
      episodes || [],
    );
    const { prompts, imageUrls, creditCost } = result;

    if (creditsRemaining < creditCost) {
      console.warn(
        `[imageGen] Insufficient credits: ${creditsRemaining} < ${creditCost}`,
      );
      return res.status(402).json({
        error: "Insufficient credits",
        message: `You need ${creditCost} credits but only have ${creditsRemaining}`,
        creditsNeeded: creditCost,
        creditsAvailable: creditsRemaining,
        correlationId,
      });
    }

    if (imageUrls.length > 0) {
      await query(
        `INSERT INTO credit_ledger (user_id, delta, reason)
         VALUES ($1, $2, $3)`,
        [
          userId,
          -creditCost,
          `Generated ${imageUrls.length} images with DALL-E`,
        ],
      );
      console.log(
        `[imageGen] Deducted ${creditCost} credits for user ${clerkUserId}`,
      );
    }

    console.log(
      `[imageGen] Successfully generated ${imageUrls.length} images for user ${clerkUserId}`,
    );

    res.json({
      success: true,
      prompts,
      imageUrls,
      creditCost,
      creditsRemaining: creditsRemaining - creditCost,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[imageGen] Error generating images:`, error);
    logError(
      { correlationId },
      "Failed to generate images",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to generate images",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleExtractImagePrompts: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { script, episodes } = req.body;

  if (!script || typeof script !== "string" || script.trim().length === 0) {
    return res.status(400).json({
      error: "Script is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[imageGen] POST /api/images/extract-prompts - script length: ${script.length}, episodes: ${(episodes || []).length}, correlationId: ${correlationId}`,
    );

    const prompts = await imageGenService.extractImagePromptsFromScript(
      script,
      episodes || [],
    );

    console.log(
      `[imageGen] Extracted ${prompts.length} image prompts from script`,
    );

    res.json({
      prompts,
      count: prompts.length,
      estimatedCost: imageGenService.calculateImageGenerationCost(
        prompts.length,
      ),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[imageGen] Error extracting prompts:`, error);
    logError(
      { correlationId },
      "Failed to extract image prompts",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to extract image prompts",
      message: errorMsg,
      correlationId,
    });
  }
};
