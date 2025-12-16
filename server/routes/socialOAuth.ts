import { getPlatformAdapter, Platform, assertOAuthSupported } from "../services/platforms";
import { RequestHandler } from "express";
import { query, queryOne } from "../db";
import { logError } from "../logging";
import { getPlatformAdapter, Platform } from "../services/platforms";
import {
  encryptAndSerialize,
  deserializeAndDecrypt,
} from "../services/tokenEncryption";
import { isFeatureAllowed } from "../services/policies";

interface SocialOAuthConnection {
  id: string;
  social_account_id: string;
  platform: string;
  access_token: string; // encrypted
  refresh_token?: string;
  expires_at?: string;
  scopes?: string;
  token_status: "active" | "expired" | "revoked" | "error";
  created_at: string;
  updated_at: string;
}

// Module 2B: Get OAuth config for platform
export const handleGetOAuthConfig: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { platform } = req.params;

  try {
    const adapter = getPlatformAdapter(platform as Platform);

    if (!adapter.getOAuthConfig) {
      return res.status(404).json({
        error: `OAuth not available for ${platform}`,
        correlationId,
      });
    }

    const config = adapter.getOAuthConfig();

    // Don't return secrets, just public info
    return res.json({
      platform,
      clientId: config.clientId,
      authorizationUrl: config.authorizationUrl,
      scopes: config.scopes,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, platform },
      "Failed to get OAuth config",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(400).json({
      error: "Invalid platform or OAuth not available",
      correlationId,
    });
  }
};

// Module 2B: Start OAuth flow (returns auth URL)
export const handleStartOAuthFlow: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const { platform } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    const adapter = getPlatformAdapter(platform as Platform);

    if (!adapter.getOAuthConfig) {
      return res.status(404).json({
        error: `OAuth not available for ${platform}`,
        correlationId,
      });
    }

    // Check feature gating
    const isAllowed = await isFeatureAllowed("oauth", "pro"); // TODO: get user's actual plan
    if (!isAllowed) {
      return res.status(403).json({
        error: "OAuth requires Premium or Enterprise plan",
        correlationId,
      });
    }

    const config = adapter.getOAuthConfig();

    // TODO: Generate state parameter for CSRF protection
    // Store state in session or DB
    const state = "state_" + Math.random().toString(36).substring(7);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
    });

    const authUrl = `${config.authorizationUrl}?${params.toString()}`;

    return res.json({
      authUrl,
      state,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, platform, userId },
      "Failed to start OAuth flow",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(400).json({
      error: "Failed to start OAuth flow",
      correlationId,
    });
  }
};

// Module 2B: OAuth callback handler
export const handleOAuthCallback: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { platform } = req.params;
  const { code, state, error } = req.query;

  try {
    if (error) {
      return res.status(400).json({
        error: `OAuth error: ${error}`,
        correlationId,
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "Missing authorization code",
        correlationId,
      });
    }

    const adapter = getPlatformAdapter(platform as Platform);

    if (!adapter.exchangeCodeForToken) {
      return res.status(404).json({
        error: `OAuth not available for ${platform}`,
        correlationId,
      });
    }

    // TODO: Verify state parameter

    // Exchange code for token
    const tokenResponse = await adapter.exchangeCodeForToken(code as string);

    // TODO: Link to social account, store encrypted token
    // For now, return the token for frontend to handle

    return res.json({
      success: true,
      platform,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, platform, code },
      "Failed to handle OAuth callback",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(400).json({
      error: "Failed to process OAuth callback",
      correlationId,
    });
  }
};

// Module 2B: Store/link OAuth connection to account
export const handleLinkOAuthConnection: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const { accountId } = req.params;
  const { platform, accessToken, refreshToken, expiresAt } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    // Verify account ownership
    const account = await queryOne<{ id: string }>(
      "SELECT id FROM social_accounts WHERE id = $1 AND user_id = $2",
      [accountId, userId],
    );

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        correlationId,
      });
    }

    // Encrypt access token
    const encryptedAccessToken = encryptAndSerialize(accessToken);
    const encryptedRefreshToken = refreshToken
      ? encryptAndSerialize(refreshToken)
      : null;

    // Insert or update OAuth connection
    const result = await query<SocialOAuthConnection>(
      `INSERT INTO social_oauth_connections (
        social_account_id, platform, access_token, refresh_token, expires_at, token_status
      ) VALUES ($1, $2, $3, $4, $5, 'active')
      ON CONFLICT (social_account_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        token_status = 'active',
        updated_at = NOW()
      RETURNING *`,
      [
        accountId,
        platform,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt ? new Date(expiresAt).toISOString() : null,
      ],
    );

    // Update social_account to mark OAuth as connected
    await query(
      "UPDATE social_accounts SET oauth_connected = TRUE, data_source = 'oauth', updated_at = NOW() WHERE id = $1",
      [accountId],
    );

    return res.json({
      success: true,
      message: "OAuth connection established",
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId, accountId },
      "Failed to link OAuth connection",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to establish OAuth connection",
      correlationId,
    });
  }
};

// Module 2B: Switch to OAuth data source for account
export const handleUseOAuthData: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).auth?.userId;
  const { accountId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", correlationId });
  }

  try {
    // Verify OAuth connection exists
    const oauthConnection = await queryOne<{ id: string }>(
      "SELECT id FROM social_oauth_connections WHERE social_account_id = $1",
      [accountId],
    );

    if (!oauthConnection) {
      return res.status(404).json({
        error: "No OAuth connection found for this account",
        correlationId,
      });
    }

    // Update account to use OAuth data source
    await query(
      "UPDATE social_accounts SET data_source = 'oauth', updated_at = NOW() WHERE id = $1 AND user_id = $2",
      [accountId, userId],
    );

    return res.json({
      success: true,
      message: "Now using OAuth data source",
      correlationId,
    });
  } catch (error) {
    logError(
      { correlationId, userId, accountId },
      "Failed to switch to OAuth data source",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to switch data source",
      correlationId,
    });
  }
};
