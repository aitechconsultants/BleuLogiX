import { RequestHandler } from "express";
import { getPool, isDbReady } from "../db";

// ============================================================================
// Health Check Routes
// ============================================================================

const COMMIT_SHA =
  process.env.COMMIT_SHA || process.env.FLY_MACHINE_VERSION || "unknown";

/**
 * GET /api/health
 * Returns service health status without leaking secrets
 */
export const handleHealth: RequestHandler = async (_req, res) => {
  // Check environment variable presence (not values)
  const env = {
    hasLeonardoKey: Boolean(process.env.LEONARDO_API_KEY),
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasDbUrl: Boolean(process.env.DATABASE_URL),
  };

  // Check service connectivity
  const services = {
    dbOk: false,
    leonardoOk: false,
  };

  // Database check
  try {
    if (isDbReady()) {
      const pool = getPool();
      const result = await pool.query("SELECT 1 as ok");
      services.dbOk = result.rows?.[0]?.ok === 1;
    }
  } catch (err) {
    console.error("[Health] DB check failed:", (err as Error).message);
    services.dbOk = false;
  }

  // Leonardo API check (lightweight - just verify auth)
  if (env.hasLeonardoKey) {
    try {
      const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
          Accept: "application/json",
        },
      });
      services.leonardoOk = response.ok;
    } catch (err) {
      console.error("[Health] Leonardo check failed:", (err as Error).message);
      services.leonardoOk = false;
    }
  }

  const ok = services.dbOk && (env.hasLeonardoKey ? services.leonardoOk : true);

  res.status(ok ? 200 : 503).json({
    ok,
    commit: COMMIT_SHA,
    env,
    services,
  });
};

/**
 * GET /api/health/routes
 * Returns list of registered routes (for debugging)
 */
export const handleHealthRoutes: RequestHandler = (req, res) => {
  const app = req.app;
  const routes: Array<{ method: string; path: string }> = [];

  // Extract routes from Express app
  const stack = (app as any)?._router?.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) =>
        m.toUpperCase(),
      );
      routes.push({ method: methods.join(","), path: layer.route.path });
    } else if (layer.name === "router" && layer.handle?.stack) {
      for (const subLayer of layer.handle.stack) {
        if (subLayer.route) {
          const methods = Object.keys(subLayer.route.methods).map((m) =>
            m.toUpperCase(),
          );
          routes.push({ method: methods.join(","), path: subLayer.route.path });
        }
      }
    }
  }

  res.json({ routes });
};

/**
 * GET /api/health/integrations
 * Admin-only detailed integration status
 */
export const handleHealthIntegrations: RequestHandler = async (_req, res) => {
  const integrations = {
    clerk: Boolean(process.env.CLERK_SECRET_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    leonardo: Boolean(process.env.LEONARDO_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    pipedream: Boolean(process.env.PIPEDREAM_SCRIPT_WORKFLOW_URL),
    database: Boolean(process.env.DATABASE_URL),
  };

  res.json({ integrations });
};

/**
 * GET /api/health/db
 * Database connectivity check
 */
export const handleHealthDB: RequestHandler = async (_req, res) => {
  try {
    if (!isDbReady()) {
      res.status(503).json({ ok: false, error: "Database not configured" });
      return;
    }

    const pool = getPool();
    const result = await pool.query("SELECT NOW() as timestamp, version() as version");
    res.json({
      ok: true,
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version,
    });
  } catch (err) {
    console.error("[Health] DB query failed:", err);
    res.status(503).json({
      ok: false,
      error: (err as Error).message,
    });
  }
};
