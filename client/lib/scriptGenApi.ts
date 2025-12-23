import { useAuth } from "@clerk/clerk-react";
import { useApiFetch, APIError } from "./api";

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

// Hook for script generation using canonical apiFetch
export function useScriptGenApi() {
  const auth = useAuth();
  const apiFetch = useApiFetch();

  return {
    generateScript: async (payload: GenerateScriptInput) => {
      if (!auth.isSignedIn) {
        throw new Error("Please sign in to generate scripts");
      }

      try {
        const response: GenerateScriptResponse = await apiFetch(
          "/api/script-gen/generate",
          {
            method: "POST",
            body: payload,
          },
        );

        return response;
      } catch (error) {
        if (error instanceof APIError) {
          if (error.status === 403 && error.data?.error === "upgrade_required") {
            throw new Error(
              `Insufficient credits. ${error.data.message || "Please upgrade your plan."}`,
            );
          }
        }
        throw error;
      }
    },
  };
}
