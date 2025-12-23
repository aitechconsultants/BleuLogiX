import { RequestHandler } from "express";
import { queryOne } from "../db";
import { logError } from "../logging";
import { getScriptGenService } from "../services/scriptGen";

const APP_START_TIME = Date.now();

interface HealthCheck {
  name: string;
  ok: boolean;
  message: string;
}

export const handleHealth: RequestHandler = async (req, res) => {
  const uptime = Math.floor((Date.now() - APP_START_TIME) / 1000);

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime,
  });
};

export const handleHealthRoutes: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const routes = {
      home: "/",
      login: "/login",
      signup: "/signup",
      video: "/video",
      videoCreate: "/video/create",
      videoHistory: "/video/history",
      accountHub: "/accounts",
      adminAudit: "/admin/audit",
      adminPolicies: "/admin/policies",
      adminUsers: "/admin/users",
    };

    res.json({
      ok: true,
      routes,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to fetch routes",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch routes",
      correlationId,
    });
  }
};

export const handleHealthIntegrations: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const checks: HealthCheck[] = [];

  try {
    // 1. Database check
    let dbCheck: HealthCheck = {
      name: "database",
      ok: false,
      message: "Not configured",
    };

    if (process.env.DATABASE_URL) {
      try {
        await queryOne("SELECT 1");
        dbCheck = {
          name: "database",
          ok: true,
          message: "Connected",
        };
      } catch (error) {
        dbCheck = {
          name: "database",
          ok: false,
          message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
    checks.push(dbCheck);

    // 2. Clerk secret key check
    const clerkCheck: HealthCheck = {
      name: "clerk_secret",
      ok: !!process.env.CLERK_SECRET_KEY,
      message: process.env.CLERK_SECRET_KEY
        ? "Present"
        : "Missing CLERK_SECRET_KEY",
    };
    checks.push(clerkCheck);

    // 3. Stripe secret key check
    const stripeSecretCheck: HealthCheck = {
      name: "stripe_secret",
      ok: !!process.env.STRIPE_SECRET_KEY,
      message: process.env.STRIPE_SECRET_KEY
        ? "Present"
        : "Missing STRIPE_SECRET_KEY",
    };
    checks.push(stripeSecretCheck);

    // 4. Stripe webhook secret check
    const stripeWebhookCheck: HealthCheck = {
      name: "stripe_webhook_secret",
      ok: !!process.env.STRIPE_WEBHOOK_SECRET,
      message: process.env.STRIPE_WEBHOOK_SECRET
        ? "Present"
        : "Missing STRIPE_WEBHOOK_SECRET",
    };
    checks.push(stripeWebhookCheck);

    // 5. Stripe price IDs check
    const proPriceOk = !!process.env.STRIPE_PRICE_PRO;
    const enterprisePriceOk = !!process.env.STRIPE_PRICE_ENTERPRISE;
    const stripePricesCheck: HealthCheck = {
      name: "stripe_prices",
      ok: proPriceOk && enterprisePriceOk,
      message:
        proPriceOk && enterprisePriceOk
          ? "Pro and Enterprise prices configured"
          : `Missing: ${!proPriceOk ? "STRIPE_PRICE_PRO " : ""}${!enterprisePriceOk ? "STRIPE_PRICE_ENTERPRISE" : ""}`.trim(),
    };
    checks.push(stripePricesCheck);

    // 7. Script generation (Pipedream) reachability check
    let scriptGenCheck: HealthCheck = {
      name: "script_generation",
      ok: false,
      message: "Not configured",
    };

    if (process.env.SCRIPT_GEN_URL && process.env.SCRIPT_GEN_TOKEN) {
      try {
        const service = getScriptGenService();
        const isHealthy = await service.checkPipedrreamHealth();
        scriptGenCheck = {
          name: "script_generation",
          ok: isHealthy,
          message: isHealthy ? "Reachable" : "Unreachable",
        };
      } catch (error) {
        scriptGenCheck = {
          name: "script_generation",
          ok: false,
          message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    } else {
      scriptGenCheck = {
        name: "script_generation",
        ok: false,
        message:
          `Missing: ${!process.env.SCRIPT_GEN_URL ? "SCRIPT_GEN_URL " : ""}${!process.env.SCRIPT_GEN_TOKEN ? "SCRIPT_GEN_TOKEN" : ""}`.trim(),
      };
    }
    checks.push(scriptGenCheck);

    // 6. Database tables check
    let tablesCheck: HealthCheck = {
      name: "database_tables",
      ok: false,
      message: "Not configured or unable to check",
    };

    if (process.env.DATABASE_URL && dbCheck.ok) {
      try {
        const requiredTables = [
          "users",
          "subscriptions",
          "credit_ledger",
          "generations",
        ];
        const existingTables: string[] = [];

        for (const table of requiredTables) {
          const result = await queryOne(
            `SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
            )`,
            [table],
          );

          if (result && result.exists) {
            existingTables.push(table);
          }
        }

        const missingTables = requiredTables.filter(
          (t) => !existingTables.includes(t),
        );

        if (missingTables.length === 0) {
          tablesCheck = {
            name: "database_tables",
            ok: true,
            message: `All required tables exist: ${requiredTables.join(", ")}`,
          };
        } else {
          tablesCheck = {
            name: "database_tables",
            ok: false,
            message: `Missing tables: ${missingTables.join(", ")}`,
          };
        }
      } catch (error) {
        tablesCheck = {
          name: "database_tables",
          ok: false,
          message: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
    checks.push(tablesCheck);

    const allOk = checks.every((c) => c.ok);

    res.json({
      ok: allOk,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to check integrations",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to check integrations",
      checks: [],
      correlationId,
    });
  }
};
