import { useAuth } from "@clerk/clerk-react";

export interface GenerateScriptInput {
  platform: "TikTok" | "YouTubeShorts" | "Reels";
  video_length_sec: number;
  style:
    | "UGC"
    | "Cinematic"
    | "Comedy"
    | "ASMR"
    | "Comparison"
    | "POVStory"
    | "Tutorial"
    | "DirectResponse";
  product_name: string;
  product_category?: string;
  key_benefits: string[];
  differentiators: string[];
  constraints?: {
    must_include?: string[];
    must_avoid?: string[];
    compliance_notes?: string;
  };
  audience: {
    target: string;
    pain_points: string[];
  };
  brand_voice: string;
  call_to_action: string;
  language?: string;
}

export interface GenerateScriptResponse {
  success: boolean;
  script: any;
  correlationId: string;
}

export interface CreateJobResponse {
  success: boolean;
  jobId: string;
  script: any;
  correlationId: string;
}

export interface GetJobResponse {
  success: boolean;
  job: any;
  correlationId: string;
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
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore parsing errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createJob(
  payload: GenerateScriptInput,
  token: string,
): Promise<CreateJobResponse> {
  const response = await fetch("/api/script-gen/jobs", {
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
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore parsing errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getJob(
  jobId: string,
  token: string,
): Promise<GetJobResponse> {
  const response = await fetch(`/api/script-gen/jobs/${jobId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
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
    createJob: async (payload: GenerateScriptInput) => {
      if (!auth.isSignedIn) {
        throw new Error("Please sign in to generate scripts");
      }
      const token = await auth.getToken();
      if (!token) throw new Error("Failed to get authentication token");
      return createJob(payload, token);
    },
    getJob: async (jobId: string) => {
      if (!auth.isSignedIn) {
        throw new Error("Please sign in to view jobs");
      }
      const token = await auth.getToken();
      if (!token) throw new Error("Failed to get authentication token");
      return getJob(jobId, token);
    },
  };
}
