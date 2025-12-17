import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";

import App from "./App";
import "./global.css";

declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>;
  }
}

function getEnv(key: string) {
  // 1) Runtime-injected from server (best for Railway)
  const fromWindow = window.__ENV__?.[key];
  if (fromWindow && fromWindow.trim().length > 0) return fromWindow.trim();

  // 2) Build-time (Vite)
  const fromVite = (import.meta as any).env?.[key];
  if (typeof fromVite === "string" && fromVite.trim().length > 0) return fromVite.trim();

  return "";
}

const publishableKey = getEnv("VITE_CLERK_PUBLISHABLE_KEY");

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: unknown }
> {
  state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const msg =
        this.state.error instanceof Error
          ? `${this.state.error.name}: ${this.state.error.message}\n\n${this.state.error.stack ?? ""}`
          : String(this.state.error);

      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ margin: 0 }}>BleuLogix crashed on startup</h2>
          <p style={{ marginTop: 8 }}>
            Open DevTools → Console, but the error is also shown below:
          </p>
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: "#111",
              color: "#fff",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg}
          </pre>
          <p style={{ marginTop: 12, opacity: 0.8 }}>
            Detected publishable key:{" "}
            <code>{publishableKey ? `${publishableKey.slice(0, 10)}…` : "(missing)"}</code>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function MissingKeyScreen() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: 0 }}>Clerk publishable key is missing</h2>
      <p style={{ marginTop: 8 }}>
        Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in Railway → Web service → Variables, then redeploy.
      </p>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Also confirm the server is injecting it:
        <br />
        <code>window.__ENV__.VITE_CLERK_PUBLISHABLE_KEY</code>
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      ) : (
        <MissingKeyScreen />
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
