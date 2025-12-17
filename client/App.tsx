import React from "react";
import { ClerkProvider } from "@clerk/clerk-react";

// 👉 import your real app router/layout here
import Routes from "./pages"; // adjust if your app uses a different root
// OR: import AppRoutes from "./routes";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "❌ Missing VITE_CLERK_PUBLISHABLE_KEY. Check Railway environment variables."
  );
}

export default function App() {
  return (
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <Routes />
      </ClerkProvider>
    </React.StrictMode>
  );
}
