import { RequestHandler } from "express";
import { query, queryOne, queryAll } from "../db";
import { logError } from "../logging";

interface AffiliateProfile {
  id: string;
  user_id: string;
  affiliate_code: string;
  created_at: string;
}

interface AffiliateEvent {
  id: string;
  affiliate_code: string;
  event_type: "click" | "signup" | "upgrade";
  value_usd?: number;
  metadata?: any;
  created_at: string;
}

// Module 2D: Get affiliate profile
export const handleGetAffiliateProfile: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    let profile = await queryOne<AffiliateProfile>(
      "SELECT * FROM affiliate_profiles WHERE user_id = $1",
      [userId]
    );

    // If no profile, create one
    if (!profile) {
      const code = generateAffiliateCode();
      const result = await query<AffiliateProfile>(
        `INSERT INTO affiliate_profiles (user_id, affiliate_code)
        VALUES ($1, $2)
        RETURNING *`,
        [userId, code]
      );
      profile = result.rows[0];
    }

    // Get event counts
    const clickCount = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM affiliate_events WHERE affiliate_code = $1 AND event_type = 'click'",
      [profile.affiliate_code]
    );

    const signupCount = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM affiliate_events WHERE affiliate_code = $1 AND event_type = 'signup'",
      [profile.affiliate_code]
    );

    const upgradeCount = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM affiliate_events WHERE affiliate_code = $1 AND event_type = 'upgrade'",
      [profile.affiliate_code]
    );

    const revenue = await queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(value_usd), 0) as total FROM affiliate_events WHERE affiliate_code = $1 AND event_type = 'upgrade'",
      [profile.affiliate_code]
    );

    return res.json({
      profile: {
        ...profile,
        stats: {
          clicks: clickCount?.count || 0,
          signups: signupCount?.count || 0,
          upgrades: upgradeCount?.count || 0,
          revenue: revenue?.total || 0,
        },
      },
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId },
      "Failed to get affiliate profile",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: "Failed to fetch profile",
      correlationId,
    });
  }
};

// Module 2D: Create affiliate profile (explicit)
export const handleCreateAffiliateProfile: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    // Check if profile already exists
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM affiliate_profiles WHERE user_id = $1",
      [userId]
    );

    if (existing) {
      return res.status(409).json({
        error: "Affiliate profile already exists",
        correlationId,
      });
    }

    const code = generateAffiliateCode();
    const result = await query<AffiliateProfile>(
      `INSERT INTO affiliate_profiles (user_id, affiliate_code)
      VALUES ($1, $2)
      RETURNING *`,
      [userId, code]
    );

    return res.status(201).json({
      profile: result.rows[0],
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId },
      "Failed to create affiliate profile",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: "Failed to create profile",
      correlationId,
    });
  }
};

// Module 2D: Redirect endpoint /r/:code
export const handleAffiliateRedirect: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { code } = req.params;

  try {
    // Log click event
    await query(
      `INSERT INTO affiliate_events (affiliate_code, event_type, metadata)
      VALUES ($1, 'click', $2)`,
      [code, JSON.stringify({ userAgent: req.headers["user-agent"] })]
    );

    // Redirect to configured landing page or home
    const redirectUrl =
      process.env.AFFILIATE_DEFAULT_REDIRECT_URL || "/";
    return res.redirect(redirectUrl);
  } catch (error) {
    logError(
      { correlationId, code },
      "Failed to log affiliate click",
      error instanceof Error ? error : new Error(String(error))
    );
    // Still redirect even if logging fails
    const redirectUrl =
      process.env.AFFILIATE_DEFAULT_REDIRECT_URL || "/";
    return res.redirect(redirectUrl);
  }
};

// Module 2D: Record affiliate event (internal/webhook)
export const handleRecordAffiliateEvent: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { affiliateCode, eventType, valueUsd, metadata } = req.body;

  // TODO: Add proper auth (webhook signature or internal token)

  try {
    if (!affiliateCode || !eventType) {
      return res.status(400).json({
        error: "affiliateCode and eventType required",
        correlationId,
      });
    }

    if (!["signup", "upgrade"].includes(eventType)) {
      return res.status(400).json({
        error: "Invalid eventType",
        correlationId,
      });
    }

    await query(
      `INSERT INTO affiliate_events (affiliate_code, event_type, value_usd, metadata)
      VALUES ($1, $2, $3, $4)`,
      [affiliateCode, eventType, valueUsd || null, metadata ? JSON.stringify(metadata) : null]
    );

    return res.json({
      success: true,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to record affiliate event",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: "Failed to record event",
      correlationId,
    });
  }
};

// Helper: Generate unique affiliate code
function generateAffiliateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
