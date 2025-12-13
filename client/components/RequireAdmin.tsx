import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

interface RequireAdminProps {
  children: ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!userId) {
          setIsAdmin(false);
          return;
        }

        // Verify admin status by calling a protected endpoint
        const token = await getToken();
        if (!token) {
          setIsAdmin(false);
          return;
        }

        const response = await fetch("/api/health/integrations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 403) {
          setError("You do not have permission to access this page.");
          setIsAdmin(false);
        } else if (response.ok) {
          setIsAdmin(true);
        } else {
          setError("Failed to verify admin status.");
          setIsAdmin(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to verify admin status"
        );
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [userId, getToken]);

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-muted border-t-accent-blue animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Verifying permissions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              {error || "You do not have permission to access this page."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
