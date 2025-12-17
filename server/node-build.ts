import "dotenv/config";

import path from "path";
import { fileURLToPath } from "url";
import express from "express";

import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";

// ✅ ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createServer();
const port = Number(process.env.PORT) || 3000;

// Paths (built output is /dist/server and /dist/spa)
const distPath = path.join(__dirname, "../spa");

console.log("[BOOT] __dirname:", __dirname);
console.log("[SPA] Serving from:", distPath);

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
  // DB bootstrap (do this once at startup)
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

  // ---------------------------------------------
  // Start server
  // ---------------------------------------------
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);

    // ---------------------------------------------
    // Module 2A Worker (safe + gated)
    // ---------------------------------------------
    const WORKER_ENABLED =
      (process.env.REFRESH_WORKER_ENABLED || "").toLowerCase() === "true";

    if (WORKER_ENABLED && dbReady) {
      try {
        startRefreshWorker(10 * 60 * 1000);
        console.log("[Worker] Started");
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
