/**
 * Pipedream Script Generator Service
 * Proxies script generation requests to Pipedream endpoint
 */

export interface PipedreamScriptInput {
  videoTopic: string;
  niche?: string;
  styleTone?: string;
  maxChars?: number;
}

export interface PipedreamScriptResponse {
  success: boolean;
  script?: string;
  error?: string;
}

const PIPEDREAM_TIMEOUT_MS = 30000;

/**
 * Call Pipedream script generation endpoint
 * Headers: x-script-gen-token, x-origin-app, Content-Type
 */
export async function generateScriptViaPipedream(
  input: PipedreamScriptInput,
  correlationId: string,
): Promise<string> {
  const endpoint = process.env.SCRIPT_GEN_URL;
  const token = process.env.SCRIPT_GEN_TOKEN;

  if (!endpoint) {
    throw new Error("server_misconfigured: SCRIPT_GEN_URL not set");
  }

  if (!token) {
    throw new Error("server_misconfigured: SCRIPT_GEN_TOKEN not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPEDREAM_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-script-gen-token": token,
        "x-origin-app": "bleulogix",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        videoTopic: input.videoTopic,
        niche: input.niche || "",
        styleTone: input.styleTone || "",
        maxChars: input.maxChars || 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Pipedream] Error response: ${response.status}`, errorText);
      throw new Error(`Pipedream error: ${response.status}`);
    }

    const data = (await response.json()) as PipedreamScriptResponse;

    if (!data.success || !data.script) {
      throw new Error(data.error || "No script returned from Pipedream");
    }

    return data.script;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("timeout");
    }

    throw error;
  }
}
