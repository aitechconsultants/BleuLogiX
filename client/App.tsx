import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

import Layout from "@/components/Layout";
import { ROUTES } from "@/config/routes";

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
 * - NO ClerkProvider here
 * - This file is a pure React component
 */

export default function App() {
  return (
    <BrowserRouter>
      <SignedOut>
        <Layout>
          <Routes>
            <Route path={ROUTES.home} element={<Index />} />
            <Route path={ROUTES.login} element={<Login />} />
            <Route path={ROUTES.signup} element={<Signup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </SignedOut>

      <SignedIn>
        <Layout>
          <Routes>
            <Route path={ROUTES.home} element={<Index />} />
            <Route path={ROUTES.generator} element={<Generator />} />
            <Route path={ROUTES.videoGenerator} element={<VideoGenerator />} />
            <Route
              path={ROUTES.videoGeneratorCreate}
              element={<VideoGeneratorCreate />}
            />
            <Route
              path={ROUTES.videoGeneratorHistory}
              element={<VideoGeneratorHistory />}
            />
            <Route path={ROUTES.accountHub} element={<AccountHub />} />
            <Route path={ROUTES.adminAudit} element={<AdminAudit />} />
            <Route path={ROUTES.adminPolicies} element={<AdminPolicies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </SignedIn>
    </BrowserRouter>
  );
}
