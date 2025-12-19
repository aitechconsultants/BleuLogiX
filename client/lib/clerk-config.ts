// Helper to read the Clerk publishable key that is injected at runtime by the server
// This ensures a single source of truth for how the key is accessed across the app

export function getClerkPublishableKey(): string | undefined {
  // First try the runtime-injected value (set by server/node-build.ts)
  const runtimeKey =
    typeof window !== "undefined"
      ? (window as any).__CLERK_PUBLISHABLE_KEY
      : undefined;

  if (runtimeKey) {
    return runtimeKey;
  }

  // Fallback to build-time env var (for backward compatibility with local dev)
  // Note: Vite doesn't expose non-VITE_ prefixed vars, so this will only work
  // if explicitly injected via vite.config.ts or build-time setup
  return import.meta.env.CLERK_PUBLISHABLE_KEY as string | undefined;
}

export function hasClerkKey(): boolean {
  return !!getClerkPublishableKey();
}
