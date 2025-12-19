import { useAuth } from "@clerk/clerk-react";
import { hasClerkKey } from "./clerk-config";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * API client hook that automatically includes Clerk authentication token
 * This hook must be called at the component level, not inside async functions
 */
export function useApiClient() {
  const clerkKeyPresent = hasClerkKey();

  // Call useAuth hook at the top level to properly manage token state
  let auth = null;
  if (clerkKeyPresent) {
    try {
      auth = useAuth();
    } catch (e) {
      // Clerk not available or not within ClerkProvider
    }
  }

  // Return async function that uses the auth object captured above
  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});

    // Add Clerk token if available
    if (auth && auth.getToken) {
      try {
        const token = await auth.getToken();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        } else {
          console.warn("No token available for authenticated request to", url);
        }
      } catch (e) {
        console.error("Failed to get Clerk token:", e);
        // Continue without auth and let backend return 401
      }
    }

    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new APIError(
        response.status,
        data.error || `API error: ${response.statusText}`,
      );
    }

    return data;
  };
}

/**
 * Non-hook API helper for use in top-level client functions
 * This is a simpler version that requires token to be passed in
 */
export async function apiCall(
  url: string,
  token: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}
