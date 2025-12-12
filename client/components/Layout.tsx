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
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fc92f13e987b1426eb13c7d459f7c6254%2F54f45d34be3943c08a0aecacd9df4dac?format=webp&width=800"
              alt="BleuLogiX"
              className="h-48 md:h-60 object-contain"
            />
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
