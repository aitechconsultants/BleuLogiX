import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";

import App from "./App";
import "./global.css";

const publishableKey = (window as any).__CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function MissingKeyScreen() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: 0 }}>Clerk publishable key is missing</h2>
      <p style={{ marginTop: 8 }}>
        Set <code>CLERK_PUBLISHABLE_KEY</code> in your environment variables, then redeploy.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <MissingKeyScreen />
    )}
  </React.StrictMode>,
);
