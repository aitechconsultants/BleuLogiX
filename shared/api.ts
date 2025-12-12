/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * User data response from /api/generator/me
 */
export interface GeneratorUserData {
  plan: "free" | "pro" | "enterprise";
  creditsRemaining: number;
  billingStatus: "free" | "pro" | "enterprise";
}

/**
 * Generation object returned from /api/generator/generate and /api/generator/history
 */
export interface Generation {
  id: string;
  user_id: string;
  template_id: string;
  input_json: any;
  voice_id: string;
  caption_style: string;
  status: "queued" | "rendering" | "complete" | "failed";
  preview_url: string | null;
  output_url: string | null;
  created_at: string;
}

/**
 * Response from billing endpoints
 */
export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface DownloadResponse {
  url: string;
}
