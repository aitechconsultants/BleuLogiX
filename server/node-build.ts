// server/node-build.ts
// Production entry (Railway) — serves SPA + API, boots DB once, optionally starts worker.

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";

import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migrations";

// ✅ ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create API app
const app = createServer();

// Environment provides PORT (Vercel, Node, etc.); default to 8080 for local
const port = Number(process.env.PORT) || 8080;

// Built output paths:
// - server bundle: dist/server
// - spa build: dist/spa
const spaDir = path.resolve(__dirname, "../spa");
const spaIndex = path.join(spaDir, "index.html");

console.log("[BOOT] server __dirname:", __dirname);
console.log("[BOOT] PORT:", port);
console.log("[SPA] spaDir:", spaDir);

// Serve SPA only if it exists (prevents confusing blank deployments)
if (fs.existsSync(spaIndex)) {
  app.use(express.static(spaDir));

  // SPA fallback (RegExp avoids path-to-regexp issues)
  // This matches any route that does NOT start with /api/ or /health
  app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
    return res.sendFile(spaIndex);
  });

  console.log("[SPA] index.html found — serving SPA");
} else {
  console.warn(
    `[SPA] index.html NOT found at ${spaIndex}. SPA will not be served (API only).`,
  );
}

async function bootstrap() {
  // ---------------------------------------------
  // DB bootstrap (once at startup)
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
    if (fs.existsSync(spaIndex)) {
      console.log(`🌐 SPA: http://localhost:${port}/`);
    }

    // ---------------------------------------------
    // Optional refresh worker (safe + gated)
    // ---------------------------------------------
    const WORKER_ENABLED =
      (process.env.REFRESH_WORKER_ENABLED || "").toLowerCase() === "true";

    if (WORKER_ENABLED && dbReady) {
      try {
        startRefreshWorker(10 * 60 * 1000);
        console.log("[Worker] Started");
      } catch (err) {
        console.error(
          "[Worker] Failed to start refresh worker (non-fatal):",
          err,
        );
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
