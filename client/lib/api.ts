import { useAuth } from "@clerk/clerk-react";

export class APIError extends Error {
  constructor(
    public status: number,
    public responseText: string,
  ) {
    super(`API error: ${status} - ${responseText}`);
  }
}

/**
 * Hook to get the apiFetch function with Clerk authentication
 * Must be called at the component level (inside ClerkProvider context)
 */
export function useApiFetch() {
  const { getToken } = useAuth();

  return async (
    path: string,
    options: RequestInit & { body?: any } = {},
  ) => {
    return apiFetchInternal(path, options, getToken);
  };
}

/**
 * Internal implementation of apiFetch that accepts a getToken function
 */
async function apiFetchInternal(
  path: string,
  options: RequestInit & { body?: any } = {},
  getToken?: () => Promise<string | null>,
) {
  const headers = new Headers(options.headers || {});

  // Add Clerk authentication token if available
  if (getToken) {
    try {
      const token = await getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (error) {
      console.error("Failed to get Clerk token:", error);
      // Continue without token and let backend return 401
    }
  }

  // Set Content-Type for requests with body
  if (options.body) {
    if (typeof options.body === "object") {
      headers.set("Content-Type", "application/json");
      options.body = JSON.stringify(options.body);
    } else {
      headers.set("Content-Type", "application/json");
    }
  } else {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(path, {
      ...options,
      headers,
    });

    // Try to parse response as JSON
    let data: any;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        typeof data === "object" ? data.error || data.message : data;
      throw new APIError(response.status, errorMsg || response.statusText);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Standalone apiFetch for use outside of React components (requires token)
 * Pass auth.getToken from outside a component
 */
export async function apiFetchWithToken(
  path: string,
  token: string,
  options: RequestInit & { body?: any } = {},
) {
  return apiFetchInternal(path, options, async () => token);
}
