import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VideoGenerator from "./pages/VideoGenerator";
import VideoGeneratorCreate from "./pages/VideoGeneratorCreate";
import VideoGeneratorHistory from "./pages/VideoGeneratorHistory";
import Generator from "./pages/Generator";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import AdminAudit from "./pages/AdminAudit";
import AdminPolicies from "./pages/AdminPolicies";
import AccountHub from "./pages/AccountHub";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";

const queryClient = new QueryClient();
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const AppContent = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup/*" element={<Signup />} />
          <Route path="/login/*" element={<Login />} />
          <Route
            path="/generator"
            element={
              <RequireAuth>
                <Generator />
              </RequireAuth>
            }
          />
          <Route path="/video-generator" element={<VideoGenerator />} />
          <Route path="/video-generator/create" element={<VideoGeneratorCreate />} />
          <Route path="/video-generator/history" element={<VideoGeneratorHistory />} />
          <Route
            path="/accounts"
            element={
              <RequireAuth>
                <AccountHub />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AdminAudit />
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/policies"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AdminPolicies />
                </RequireAdmin>
              </RequireAuth>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => {
  // If Clerk key is not provided, render without Clerk authentication
  // This allows development without Clerk credentials
  if (!clerkPublishableKey) {
    return <AppContent />;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AppContent />
    </ClerkProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
