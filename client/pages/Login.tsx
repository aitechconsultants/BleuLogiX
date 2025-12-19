import { Link } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import Layout from "@/components/Layout";

import { hasClerkKey } from "@/lib/clerk-config";

export default function Login() {
  const clerkKeyPresent = hasClerkKey();

  if (!clerkKeyPresent) {
    // Fallback UI when Clerk is not configured
    return (
      <Layout>
        <div className="min-h-[calc(100vh-120px)] bg-background flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-foreground">Log In</h1>
              <p className="text-muted-foreground">
                Access your account and continue creating
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 space-y-6">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                Clerk authentication is not configured. Please set
                CLERK_PUBLISHABLE_KEY to enable login.
              </div>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Don't have an account?{" "}
                </span>
                <Link
                  to="/signup"
                  className="text-accent-blue hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            redirectUrl="/generator"
          />
        </div>
      </div>
    </Layout>
  );
}
