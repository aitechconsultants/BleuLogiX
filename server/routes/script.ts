import { RequestHandler } from "express";
import { logError } from "../logging";

interface GenerateScriptRequest {
  videoTopic: string;
  niche?: string;
  styleTone?: string;
  maxChars?: number;
}

interface GenerateScriptResponse {
  script: string;
}

export const handleGenerateScript: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const scriptGenUrl = process.env.SCRIPT_GEN_URL;

  if (!scriptGenUrl) {
    return res.status(503).json({
      error: "Script generation is not configured",
      correlationId,
    });
  }

  try {
    const payload: GenerateScriptRequest = req.body;

    if (!payload.videoTopic) {
      return res.status(400).json({
        error: "videoTopic is required",
        correlationId,
      });
    }

    const response = await fetch(scriptGenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoTopic: payload.videoTopic,
        niche: payload.niche || "",
        styleTone: payload.styleTone || "",
        maxChars: payload.maxChars || 500,
      }),
    });

    if (!response.ok) {
      let errorMessage = `External service returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignore parsing errors
      }

      logError(
        { correlationId },
        `Script generation service error: ${errorMessage}`,
        new Error(errorMessage),
      );

      return res.status(response.status).json({
        error: errorMessage,
        correlationId,
      });
    }

    const data = await response.json();
    const script = data.script || data.text || "";

    if (!script) {
      logError(
        { correlationId },
        "Script generation returned empty response",
        new Error("Empty script response"),
      );

      return res.status(502).json({
        error: "No script returned from generation service",
        correlationId,
      });
    }

    res.json({ script } as GenerateScriptResponse);
  } catch (error) {
    logError(
      { correlationId },
      "Script generation request failed",
      error instanceof Error ? error : new Error(String(error)),
    );

    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to generate script",
      correlationId,
    });
  }
};
