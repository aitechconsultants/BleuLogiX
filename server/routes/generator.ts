import { RequestHandler } from "express";
import { queryOne, queryAll, query } from "../db";
import { logError } from "../logging";

interface Subscription {
  id: string;
  user_id: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "trialing" | "canceled" | "past_due";
}

interface Generation {
  id: string;
  user_id: string;
  template_id: string;
  input_json: any;
  voice_id: string;
  caption_style: string;
  status: "queued" | "rendering" | "complete" | "failed";
  preview_url: string | null;
  output_url: string | null;
  created_at: string;
}

// Helper: Get or create subscription
async function getOrCreateSubscription(
  userId: string
): Promise<Subscription> {
  let sub = await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId]
  );

  if (!sub) {
    const result = await query<Subscription>(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, 'free', 'active')
       RETURNING id, user_id, plan, status`,
      [userId]
    );
    sub = result.rows[0];
  }

  return sub;
}

// Helper: Calculate remaining credits
async function getCreditsRemaining(userId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(delta), 0) as total FROM credit_ledger WHERE user_id = $1`,
    [userId]
  );
  return result?.total || 0;
}

// Helper: Map subscription to billing status
function getBillingStatus(
  plan: "free" | "pro" | "enterprise"
): "free" | "pro" | "enterprise" {
  return plan;
}

export const handleGetMe: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sub = await getOrCreateSubscription(userId);
    const creditsRemaining = await getCreditsRemaining(userId);

    res.json({
      plan: sub.plan,
      creditsRemaining,
      billingStatus: getBillingStatus(sub.plan),
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

export const handleGenerate: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      templateId,
      inputJson,
      voiceId,
      captionStyle,
    } = req.body as {
      templateId: string;
      inputJson: any;
      voiceId: string;
      captionStyle: string;
    };

    // Validate input
    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    const creditCost = 10;
    const creditsRemaining = await getCreditsRemaining(userId);

    if (creditsRemaining < creditCost) {
      return res.status(402).json({
        error: `Insufficient credits. Required: ${creditCost}, Available: ${creditsRemaining}`,
      });
    }

    // Create generation record
    const result = await query<Generation>(
      `INSERT INTO generations (user_id, template_id, input_json, voice_id, caption_style, status)
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING *`,
      [userId, templateId, inputJson, voiceId, captionStyle]
    );

    const generation = result.rows[0];

    // Deduct credits
    await query(
      `INSERT INTO credit_ledger (user_id, delta, reason, related_generation_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, -creditCost, "Video generation", generation.id]
    );

    res.status(201).json(generation);
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Failed to generate video" });
  }
};

export const handleGetHistory: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const generations = await queryAll<Generation>(
      `SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    res.json(generations);
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ error: "Failed to fetch generation history" });
  }
};

export const handleDownload: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { generationId, quality } = req.body as {
      generationId: string;
      quality: "watermarked" | "hd";
    };

    if (!generationId) {
      return res.status(400).json({ error: "generationId is required" });
    }

    // Verify generation belongs to user
    const generation = await queryOne<Generation>(
      `SELECT * FROM generations WHERE id = $1 AND user_id = $2`,
      [generationId, userId]
    );

    if (!generation) {
      return res.status(404).json({ error: "Generation not found" });
    }

    // Check entitlements
    if (quality === "hd") {
      const sub = await getOrCreateSubscription(userId);
      if (sub.plan === "free") {
        return res.status(403).json({
          error: "HD downloads require Pro or Enterprise plan",
        });
      }
    }

    // Generate mock download URL (in production, this would return a signed S3 URL)
    const downloadUrl = `https://api.example.com/downloads/${generationId}?quality=${quality}&token=${Date.now()}`;

    res.json({ url: downloadUrl });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};
