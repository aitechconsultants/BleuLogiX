import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";

const app = createServer();
const port = Number(process.env.PORT) || 3000;

// ESM-safe dirname
const __dirname = import.meta.dirname;

// ✅ IMPORTANT: pick the correct SPA output directory
// Most setups end up with dist/spa as the built client output.
// Since this file compiles to dist/server/node-build.mjs,
// using "../spa" points to dist/spa.
const distPath = path.join(__dirname, "../spa");
const indexHtmlPath = path.join(distPath, "index.html");

// Serve static files (Vite build output)
app.use(express.static(distPath));

// SPA fallback for React Router (RegExp avoids path-to-regexp parsing issues)
app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    // If this happens, your build output path is wrong or the SPA build didn't run
    return res.status(500).json({
      error: "SPA index.html not found",
      hint: "Check build output path (dist/spa) and that client build ran.",
      lookedFor: indexHtmlPath,
    });
  }
  return res.sendFile(indexHtmlPath);
});

async function bootstrap() {
  // ---------------------------------------------
  // DB bootstrap (do once at startup)
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
      // dbReady remains false → worker will not start
    }
  } else {
    console.log("[DB] DATABASE_URL missing, skipping init");
  }

  app.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
    console.log(`[SPA] Serving from: ${distPath}`);

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
