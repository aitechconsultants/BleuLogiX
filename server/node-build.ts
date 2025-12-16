import path from "path";
import express from "express";
import { createServer } from "./index";
import { startRefreshWorker } from "./services/refreshWorker";

const app = createServer();
const port = Number(process.env.PORT) || 3000;

// In production, serve the built SPA files
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

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);

  // Start refresh worker for Module 2A (10-minute interval)
  startRefreshWorker(10 * 60 * 1000);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`🛑 Received ${signal}, shutting down gracefully`);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
