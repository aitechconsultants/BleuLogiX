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
import Generator from "@/pages/Generator";
import VideoGenerator from "@/pages/VideoGenerator";
import VideoGeneratorCreate from "@/pages/VideoGeneratorCreate";
import VideoGeneratorHistory from "@/pages/VideoGeneratorHistory";
import AccountHub from "@/pages/AccountHub";
import AdminAudit from "@/pages/AdminAudit";
import AdminPolicies from "@/pages/AdminPolicies";
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
      <Routes>
        {/* Routes for signed-out users */}
        <Route
          path={ROUTES.home}
          element={
            <SignedOut fallback={null}>
              <Layout>
                <Index />
              </Layout>
            </SignedOut>
          }
        />
        <Route
          path={ROUTES.login}
          element={
            <SignedOut fallback={null}>
              <Layout>
                <Login />
              </Layout>
            </SignedOut>
          }
        />
        <Route
          path={ROUTES.signup}
          element={
            <SignedOut fallback={null}>
              <Layout>
                <Signup />
              </Layout>
            </SignedOut>
          }
        />

        {/* Routes for signed-in users */}
        <Route
          path={ROUTES.generator}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <Generator />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.videoGenerator}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <VideoGenerator />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.videoGeneratorCreate}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <VideoGeneratorCreate />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.videoGeneratorHistory}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <VideoGeneratorHistory />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.accountHub}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <AccountHub />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.adminAudit}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <AdminAudit />
              </Layout>
            </SignedIn>
          }
        />
        <Route
          path={ROUTES.adminPolicies}
          element={
            <SignedIn fallback={null}>
              <Layout>
                <AdminPolicies />
              </Layout>
            </SignedIn>
          }
        />

        {/* Catch-all for both signed-out and signed-in */}
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
