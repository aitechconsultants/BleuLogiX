import { ReactNode } from "react";
import { Link } from "react-router-dom";
import CreditsBadge from "./CreditsBadge";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="text-2xl font-display font-bold text-gradient-blue">
              BleuLogiX
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/video-generator"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Generator
            </Link>
            <Link
              to="/video-generator/history"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </Link>
          </nav>

          <CreditsBadge />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
