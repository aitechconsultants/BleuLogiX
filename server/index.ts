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

// Mock authentication middleware for development
// In production, this would validate JWT tokens or session cookies
const authMiddleware: RequestHandler = (req, res, next) => {
  // Get user ID from query param, header, or environment
  const userId = req.query.userId as string || req.headers["x-user-id"] as string || process.env.DEV_USER_ID || "dev-user-123";
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
