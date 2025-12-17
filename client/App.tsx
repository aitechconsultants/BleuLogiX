import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";

/**
 * IMPORTANT:
 * - NO ReactDOM.createRoot here
 * - NO ClerkProvider here
 * - This file is a pure React component
 */

function Home() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <h1>BleuLogiX is running 🚀</h1>
      <p>If you can see this, React + routing are working.</p>

      <div style={{ marginTop: 16 }}>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}

function SignedOutScreen() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <h1>Welcome to BleuLogiX</h1>
      <p>You must sign in to continue.</p>

      <div style={{ marginTop: 16 }}>
        <SignInButton mode="modal" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SignedOut>
        <SignedOutScreen />
      </SignedOut>

      <SignedIn>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </SignedIn>
    </BrowserRouter>
  );
}
