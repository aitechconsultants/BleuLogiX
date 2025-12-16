import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";

const app = createServer();
const port = Number(process.env.PORT) || 3000;

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Serve static files (Vite build output)
app.use(express.static(distPath));

/**
 * SPA fallback for React Router
 * Use a RegExp path to avoid path-to-regexp string parsing issues.
 *
 * This matches any route that does NOT start with:
 *   /api/   or   /health
 */
app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
  return res.sendFile(path.join(distPath, "index.html"));
});

async function bootstrap() {
  // ---------------------------------------------
  // DB bootstrap (recommended: do this once at startup)
  // ---------------------------------------------
  const HAS_DB = Boolean(process.env.DATABASE_URL);
  let dbReady = false;

  if (HAS_DB) {
    try {
      initializeDatabase();
      await runMigrations();
      dbReady = true;
      console.log("[DB] Initialized and migrations applied");
    } catch (err) {
      console.error("[DB] Initialization/migrations failed (non-fatal):", err);
    }
  } else {
    console.log("[DB] DATABASE_URL missing, skipping init");
  }

  app.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);

    // ---------------------------------------------
    // Module 2A Worker (safe + gated)
    // ---------------------------------------------
    const WORKER_ENABLED =
      (process.env.REFRESH_WORKER_ENABLED || "").toLowerCase() === "true";

    if (WORKER_ENABLED && dbReady) {
      try {
        startRefreshWorker(10 * 60 * 1000);
      } catch (err) {
        console.error("[Worker] Failed to start refresh worker (non-fatal):", err);
      }
    } else {
      console.log(
        `[Worker] Not started. REFRESH_WORKER_ENABLED=${WORKER_ENABLED} DB_READY=${dbReady}`,
      );
    }
  });
}

bootstrap().catch((err) => {
  console.error("[BOOT] Fatal bootstrap error:", err);
  process.exit(1);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`🛑 Received ${signal}, shutting down gracefully`);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
