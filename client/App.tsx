import React from "react";
import { BrowserRouter } from "react-router-dom";

/**
 * IMPORTANT:
 * - NO ReactDOM.createRoot here
 * - NO ClerkProvider here
 * - This file must be a pure component only
 */

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          padding: 24,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        }}
      >
        <h1>BleuLogix is running 🚀</h1>
        <p>If you can see this, React + routing are working.</p>
      </div>
    </BrowserRouter>
  );
}
