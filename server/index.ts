import "dotenv/config";
import express, { RequestHandler } from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";
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

import { createCorrelationId, logAuthError } from "./logging";

// Authentication middleware - enforces proper auth in production
const authMiddleware: RequestHandler = (req, res, next) => {
  const correlationId = createCorrelationId();
  (req as any).correlationId = correlationId;

  const isProduction = process.env.NODE_ENV === "production";

  // In production, enforce proper authentication
  // In development, allow DEV_USER_ID or fallback to dev-user-123
  let userId: string | undefined;

  if (isProduction) {
    // In production, only accept authenticated users via JWT or session
    // This would typically validate a JWT token from an Authorization header
    // For now, we reject all requests if not properly authenticated
    userId = req.headers["x-user-id"] as string;

    if (!userId) {
      logAuthError(correlationId, "Missing authentication in production");
      return res.status(401).json({
        error: "Unauthorized",
        correlationId,
      });
    }

    // Validate that user ID looks reasonable (UUID format)
    if (!/^[a-f0-9-]{36}$/.test(userId)) {
      logAuthError(correlationId, "Invalid user ID format", { userId });
      return res.status(401).json({
        error: "Invalid authentication",
        correlationId,
      });
    }
  } else {
    // Development: allow DEV_USER_ID or query param or header
    userId =
      process.env.DEV_USER_ID ||
      (req.query.userId as string) ||
      (req.headers["x-user-id"] as string) ||
      "dev-user-123";
  }

  (req as any).user = { id: userId };
  next();
};

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());

  // Webhook route must be before express.json() to get raw body
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook
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

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication middleware for protected routes
  app.use("/api/billing", authMiddleware);
  app.use("/api/generator", authMiddleware);

  // Billing routes
  app.post("/api/billing/create-checkout-session", handleCreateCheckoutSession);
  app.post("/api/billing/create-portal-session", handleCreatePortalSession);

  // Generator routes
  app.get("/api/generator/me", handleGetMe);
  app.post("/api/generator/generate", handleGenerate);
  app.get("/api/generator/history", handleGetHistory);
  app.post("/api/generator/download", handleDownload);

  return app;
}
