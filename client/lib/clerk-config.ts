// Helper to read the Clerk publishable key that is injected at runtime by the server
// This ensures a single source of truth for how the key is accessed across the app

export function getClerkPublishableKey(): string | undefined {
  // Get the runtime-injected value set by server/node-build.ts
  // This is the primary source for both dev and production
  if (typeof window !== "undefined") {
    const runtimeKey = (window as any).__CLERK_PUBLISHABLE_KEY;
    if (runtimeKey) {
      return runtimeKey;
    }
  }

  // Fallback for dev mode (when running without the server injection)
  // Try VITE_ prefixed version since Vite only exposes those
  const viteKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined;
  if (viteKey) {
    return viteKey;
  }

  return undefined;
}

export function hasClerkKey(): boolean {
  return !!getClerkPublishableKey();
}
