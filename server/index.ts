import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import { handleDemo } from "./routes/demo";
import { requireClerkAuth } from "./clerk-auth";
import { requireAdminAuth } from "./admin-auth";
import { runRouteSelfTest, wrapRouter } from "./services/routeSelfTest";
import { handleSync, handleAuthDebug } from "./routes/auth";

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

import {
  handleAddAccount,
  handleListAccounts,
  handleRefreshAccount,
  handleRemoveAccount,
  handleUpdateRefreshSettings,
  handleRunRefreshCycle,
} from "./routes/socialAccounts";

import {
  handleGetPlanPolicies,
  handleUpdatePlanPolicy,
  handleGetWorkspaceOverrides,
  handleUpdateWorkspaceOverride,
  handleDeleteWorkspaceOverride,
} from "./routes/adminPolicies";

import {
  handleGetAllUsers,
  handleUpdateUserRole,
  handleSetPlanOverride,
  handleClearPlanOverride,
  handleGrantCredits,
  handleGrantCreditsToSelf,
  handleBootstrapAdmin,
} from "./routes/adminUsers";

import {
  handleGetOAuthConfig,
  handleStartOAuthFlow,
  handleOAuthCallback,
  handleLinkOAuthConnection,
  handleUseOAuthData,
} from "./routes/socialOAuth";

import {
  handleGetAffiliateProfile,
  handleCreateAffiliateProfile,
  handleAffiliateRedirect,
  handleRecordAffiliateEvent,
} from "./routes/affiliate";

export function createServer() {
  const app = express();

  // Route self-test: wrap router to catch errors at definition-time
  if (process.env.ROUTE_SELF_TEST === "2") {
    console.log("[routeSelfTest] Mode 2 enabled - wrapping route registration");
    wrapRouter(app);
  }

  // Middleware
  app.use(cors());

  // IMPORTANT:
  // Do NOT mount clerkMiddleware() globally.
  // Keep public routes (/, /health, SPA assets) free of Clerk handshake/auth.
  const clerk = clerkMiddleware();

  // Webhook route must be before express.json() to get raw body
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook,
  );

  // JSON middleware for other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes (public)
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "fusion-starter" });
  });
  app.get("/api/health", handleHealth);
  app.get("/api/health/routes", handleHealthRoutes);

  // Anything under /api can use Clerk safely
  app.use("/api", clerk);

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
  app.get("/api/auth/debug", requireClerkAuth, handleAuthDebug);

  // Protected routes
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

  // Script generation proxy route (requires auth)
  app.post("/api/script/generate", requireClerkAuth, handleGenerateScript);

  // Script generation service routes (requires auth)
  app.use("/api/script-gen", requireClerkAuth, scriptGenRouter);

  // Social accounts routes (require auth)
  app.use("/api/social-accounts", requireClerkAuth);
  app.post("/api/social-accounts", handleAddAccount);
  app.get("/api/social-accounts", handleListAccounts);
  app.post("/api/social-accounts/:id/refresh", handleRefreshAccount);
  app.delete("/api/social-accounts/:id", handleRemoveAccount);
  app.put(
    "/api/social-accounts/:id/refresh-settings",
    handleUpdateRefreshSettings,
  );

  // Module 2A: Worker endpoint (admin/dev only)
  app.post("/api/social-accounts/worker/run-once", handleRunRefreshCycle);

  // Module 2C: Admin policy routes (admin only)
  app.get(
    "/api/admin/plan-policies",
    requireClerkAuth,
    requireAdminAuth,
    handleGetPlanPolicies,
  );
  app.put(
    "/api/admin/plan-policies/:plan_key",
    requireClerkAuth,
    requireAdminAuth,
    handleUpdatePlanPolicy,
  );

  app.get(
    "/api/admin/workspace-overrides",
    requireClerkAuth,
    requireAdminAuth,
    handleGetWorkspaceOverrides,
  );
  app.put(
    "/api/admin/workspace-overrides/:workspace_id",
    requireClerkAuth,
    requireAdminAuth,
    handleUpdateWorkspaceOverride,
  );
  app.delete(
    "/api/admin/workspace-overrides/:workspace_id",
    requireClerkAuth,
    requireAdminAuth,
    handleDeleteWorkspaceOverride,
  );

  // Bootstrap endpoint - set current user as admin (requires Clerk auth only)
  app.post("/api/admin/bootstrap", requireClerkAuth, handleBootstrapAdmin);

  // Admin users routes (admin only)
  app.get(
    "/api/admin/users",
    requireClerkAuth,
    requireAdminAuth,
    handleGetAllUsers,
  );
  app.put(
    "/api/admin/users/:userId/role",
    requireClerkAuth,
    requireAdminAuth,
    handleUpdateUserRole,
  );
  app.put(
    "/api/admin/users/:userId/plan-override",
    requireClerkAuth,
    requireAdminAuth,
    handleSetPlanOverride,
  );
  app.delete(
    "/api/admin/users/:userId/plan-override",
    requireClerkAuth,
    requireAdminAuth,
    handleClearPlanOverride,
  );
  app.post(
    "/api/admin/users/:userId/grant-credits",
    requireClerkAuth,
    requireAdminAuth,
    handleGrantCredits,
  );
  app.post(
    "/api/admin/grant-credits-self",
    requireClerkAuth,
    requireAdminAuth,
    handleGrantCreditsToSelf,
  );

  // Module 2B: OAuth routes
  app.get("/api/social-oauth/:platform/config", handleGetOAuthConfig);
  app.get(
    "/api/social-oauth/:platform/start",
    requireClerkAuth,
    handleStartOAuthFlow,
  );
  app.get("/api/social-oauth/:platform/callback", handleOAuthCallback);
  app.post(
    "/api/social-accounts/:accountId/oauth/link",
    requireClerkAuth,
    handleLinkOAuthConnection,
  );
  app.post(
    "/api/social-accounts/:accountId/use-oauth",
    requireClerkAuth,
    handleUseOAuthData,
  );

  // Module 2D: Affiliate routes
  app.get(
    "/api/affiliate/profile",
    requireClerkAuth,
    handleGetAffiliateProfile,
  );
  app.post(
    "/api/affiliate/create",
    requireClerkAuth,
    handleCreateAffiliateProfile,
  );
  app.get("/r/:code", handleAffiliateRedirect);
  app.post("/api/affiliate/events", handleRecordAffiliateEvent);

  // Route self-test: validate all registered routes
  if (process.env.ROUTE_SELF_TEST === "1") {
    console.log("[routeSelfTest] Mode 1 enabled - validating routes");
    runRouteSelfTest(app, "express-app");
  }

  return app;
}
