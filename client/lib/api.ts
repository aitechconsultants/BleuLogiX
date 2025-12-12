import { useAuth } from "@clerk/clerk-react";

/**
 * API client hook that automatically includes Clerk authentication token
 */
export function useApiClient() {
  const { getToken } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const token = await getToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

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
