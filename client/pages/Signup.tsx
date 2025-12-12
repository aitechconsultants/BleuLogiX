import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

export default function Signup() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground">
              Sign up to start creating videos
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 space-y-6">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg font-semibold bg-accent-blue text-black hover:bg-highlight-blue transition-colors"
              >
                Sign Up
              </button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-accent-blue hover:underline font-medium">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
