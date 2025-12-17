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

// Prefer runtime-injected env (from server), fallback to Vite build-time env.
const publishableKey =
  window.__ENV__?.VITE_CLERK_PUBLISHABLE_KEY ??
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined);

function FatalScreen(props: { title: string; detail?: string }) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#fff" }}>
      <h2 style={{ margin: 0 }}>{props.title}</h2>
      {props.detail ? (
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", opacity: 0.9 }}>
          {props.detail}
        </pre>
      ) : null}
      <p style={{ marginTop: 12, opacity: 0.9 }}>
        Open DevTools → Console and share the top error line if this persists.
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err?: Error }
> {
  state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.error("[ClientErrorBoundary]", err);
  }
  render() {
    if (this.state.err) {
      return (
        <FatalScreen
          title="Client crashed before rendering"
          detail={this.state.err.stack || this.state.err.message}
        />
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element in index.html");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      {!publishableKey ? (
        <FatalScreen
          title="Clerk publishable key is missing"
          detail="Set VITE_CLERK_PUBLISHABLE_KEY (recommended: via server runtime injection) and redeploy."
        />
      ) : (
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
