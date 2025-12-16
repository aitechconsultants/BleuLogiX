import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { handleDemo } from "./routes/demo";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";
import { requireClerkAuth } from "./clerk-auth";
import { requireAdminAuth } from "./admin-auth";
import { handleSync } from "./routes/auth";
import {
  handleCreateCheckoutSession,
  handleWebhook,
  handleCreatePortalSession,
} from "./routes/billing";
import {
  handleGetMe,
  handleGenerate,
  handleGetHistory,
  handleDownload,
} from "./routes/generator";
import {
  handleHealth,
  handleHealthRoutes,
  handleHealthIntegrations,
} from "./routes/health";
import { handleGenerateScript } from "./routes/script";
import { scriptGenRouter } from "./routes/scriptGen";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(clerkMiddleware());

  // Webhook route must be before express.json() to get raw body
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook,
  );

  // JSON middleware for other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database on first request
  let dbInitialized = false;
  app.use(async (req, res, next) => {
    if (!dbInitialized && process.env.DATABASE_URL) {
      try {
        initializeDatabase();
        await runMigrations();
        dbInitialized = true;
      } catch (error) {
        console.error("Database initialization error:", error);
        // Continue without database if not configured
      }
    }
    next();
  });

  // Health check routes
  app.get("/api/health", handleHealth);
  app.get("/api/health/routes", handleHealthRoutes);
  app.get(
    "/api/health/integrations",
    requireClerkAuth,
    requireAdminAuth,
    handleHealthIntegrations,
  );

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes
  app.post("/api/auth/sync", requireClerkAuth, handleSync);

  // Protected routes - use Clerk authentication middleware
  app.use("/api/billing", requireClerkAuth);
  app.use("/api/generator", requireClerkAuth);

  // Billing routes
  app.post("/api/billing/create-checkout-session", handleCreateCheckoutSession);
  app.post("/api/billing/create-portal-session", handleCreatePortalSession);

  // Generator routes
  app.get("/api/generator/me", handleGetMe);
  app.post("/api/generator/generate", handleGenerate);
  app.get("/api/generator/history", handleGetHistory);
  app.post("/api/generator/download", handleDownload);

  // Script generation proxy route
  app.post("/api/script/generate", handleGenerateScript);

  return app;
}
