import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

import Layout from "@/components/Layout";
import { ROUTES } from "@/config/routes";
import { hasClerkKey } from "@/lib/clerk-config";

// Pages
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VideoGenerator from "@/pages/VideoGenerator";
import VideoGeneratorCreate from "@/pages/VideoGeneratorCreate";
import VideoGeneratorHistory from "@/pages/VideoGeneratorHistory";
import AccountHub from "@/pages/AccountHub";
import AdminAudit from "@/pages/AdminAudit";
import AdminPolicies from "@/pages/AdminPolicies";
import AdminUsers from "@/pages/admin/AdminUsers";
import NotFound from "@/pages/NotFound";

/**
 * IMPORTANT:
 * - NO ReactDOM.createRoot here
 * - NO ClerkProvider here (it's in main.tsx)
 * - This file is a pure React component
 */

function MissingKeyScreen() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: 0 }}>Clerk publishable key is missing</h2>
      <p style={{ marginTop: 8 }}>
        Set <code>CLERK_PUBLISHABLE_KEY</code> in your environment variables,
        then redeploy.
      </p>
    </div>
  );
}

export default function App() {
  const clerkKeyPresent = hasClerkKey();

  // Show error if Clerk is not configured
  if (!clerkKeyPresent) {
    return <MissingKeyScreen />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.home} element={<Index />} />
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.signup} element={<Signup />} />

          {/* Video generator routes */}
          <Route path={ROUTES.video} element={<VideoGenerator />} />
          <Route path={ROUTES.videoCreate} element={<VideoGeneratorCreate />} />
          <Route
            path={ROUTES.videoHistory}
            element={<VideoGeneratorHistory />}
          />

          {/* Protected routes - only for signed-in users */}
          <Route path={ROUTES.accountHub} element={<AccountHub />} />
          <Route path={ROUTES.adminAudit} element={<AdminAudit />} />
          <Route path={ROUTES.adminPolicies} element={<AdminPolicies />} />
          <Route path={ROUTES.adminUsers} element={<AdminUsers />} />

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
