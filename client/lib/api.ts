import { useAuth } from "@clerk/clerk-react";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * API client hook that automatically includes Clerk authentication token
 * Falls back to unauthenticated requests if Clerk is not available
 */
export function useApiClient() {
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  let getToken = null;

  // Only use Clerk hook if it's available
  if (hasClerkKey) {
    try {
      const auth = useAuth();
      getToken = auth.getToken;
    } catch (e) {
      // Clerk not available
    }
  }

  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});

    // Add Clerk token if available
    if (getToken) {
      try {
        const token = await getToken();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      } catch (e) {
        // Token retrieval failed, continue without auth
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
        data.error || `API error: ${response.statusText}`
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
  options: RequestInit = {}
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
