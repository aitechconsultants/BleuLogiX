import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";

const app = createServer();
const port = Number(process.env.PORT) || 3000;

// Paths (built output is /app/dist/server and /app/dist/spa in Railway)
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

console.log("[BOOT] __dirname:", __dirname);
console.log("[SPA] Serving from:", distPath);

// Serve static files (Vite build output)
app.use(express.static(distPath));

// Hard “always responds” endpoints (good for Railway edge validation)
app.get("/", (_req, res) => res.status(200).send("OK"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

/**
 * SPA fallback for React Router
 * RegExp avoids path-to-regexp parsing issues.
 * Matches any route NOT starting with /api/ or /health
 */
app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
  return res.sendFile(path.join(distPath, "index.html"));
});

async function bootstrap() {
  // DB bootstrap once at startup
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

  // ✅ Force bind to all interfaces (Railway-safe)
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);

    // Worker gated + safe
    const WORKER_ENABLED =
      (process.env.REFRESH_WORKER_ENABLED || "").toLowerCase() === "true";

    if (WORKER_ENABLED && dbReady) {
      try {
        startRefreshWorker(10 * 60 * 1000);
        console.log("[Worker] Started");
      } catch (err) {
        console.error("[Worker] Failed to start (non-fatal):", err);
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
