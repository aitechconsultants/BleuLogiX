import { useAuth } from "@clerk/clerk-react";

export interface GenerateScriptInput {
  videoTopic: string;
  niche: string;
  styleTone: string;
  maxChars?: number;
}

export interface GenerateScriptResponse {
  ok: boolean;
  success?: boolean;
  script: any;
  creditsRemaining?: number;
  correlationId: string;
  error?: string;
  message?: string;
}

export async function generateScript(
  payload: GenerateScriptInput,
  token: string,
): Promise<GenerateScriptResponse> {
  const response = await fetch("/api/script-gen/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error === "upgrade_required") {
        errorMessage = `Insufficient credits. ${errorData.message || "Please upgrade your plan."}`;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore parsing errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Hook for script generation
export function useScriptGenApi() {
  const auth = useAuth();

  return {
    generateScript: async (payload: GenerateScriptInput) => {
      if (!auth.isSignedIn) {
        throw new Error("Please sign in to generate scripts");
      }
      const token = await auth.getToken();
      if (!token) throw new Error("Failed to get authentication token");
      return generateScript(payload, token);
    },
  };
}
