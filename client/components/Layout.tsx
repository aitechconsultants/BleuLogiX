import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import CreditsBadge from "./CreditsBadge";
import { ROUTES } from "@/config/routes";
import { hasClerkKey } from "@/lib/clerk-config";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const clerkKeyPresent = hasClerkKey();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-background sticky top-0 z-50">
          <div
            className="max-w-6xl mx-auto px-3 md:px-4"
            style={{
              minHeight: "120px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "14px",
              paddingBottom: "24px",
            }}
          >
            <Link
              to={ROUTES.home}
              className="flex items-center justify-center flex-shrink-0"
              style={{ paddingLeft: "50px" }}
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fc92f13e987b1426eb13c7d459f7c6254%2F54f45d34be3943c08a0aecacd9df4dac?format=webp&width=800"
                alt="BleuLogiX"
                className="h-48 md:h-68 object-contain"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-5 flex-1 justify-center">
              <Link
                to={ROUTES.home}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                to={ROUTES.videoGenerator}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Generator
              </Link>
              <Link
                to={ROUTES.home}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Templates
              </Link>
              <Link
                to={ROUTES.home}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                to={ROUTES.home}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                to={ROUTES.home}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("learn")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Learn
              </Link>

              {!clerkKeyPresent ? (
                // Clerk not configured - show login/signup
                <>
                  <Link
                    to={ROUTES.login}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to={ROUTES.signup}
                    className="px-4 py-2 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors text-sm"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <SignedOut>
                    <Link
                      to={ROUTES.login}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to={ROUTES.signup}
                      className="px-4 py-2 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors text-sm"
                    >
                      Sign Up
                    </Link>
                  </SignedOut>

                  <SignedIn>
                    <Link
                      to={ROUTES.generator}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={ROUTES.accountHub}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Accounts
                    </Link>
                    <Link
                      to={ROUTES.adminPolicies}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors text-xs opacity-75"
                      title="Admin only"
                    >
                      Admin Policies
                    </Link>
                    <UserButton
                      afterSignOutUrl={ROUTES.home}
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10",
                        },
                      }}
                    />
                  </SignedIn>
                </>
              )}
            </nav>

            <div className="flex-shrink-0">
              <CreditsBadge />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </TooltipProvider>
  );
}
