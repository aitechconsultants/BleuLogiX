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

  try {
    const { videoTopic, niche, styleTone, maxChars } = req.body;

    if (!videoTopic || !niche || !styleTone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const SCRIPT_URL = process.env.SCRIPT_GEN_URL;

    if (!SCRIPT_URL) {
      return res.status(501).json({
        error: "Script generation service not configured",
      });
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoTopic, niche, styleTone, maxChars }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        error: data?.error || "Upstream script service failed",
      });
    }

    const script = data.script || data.text;

    if (!script) {
      return res.status(502).json({ error: "No script returned" });
    }

    return res.json({ script });
  } catch (err) {
    console.error("Script generation error:", err);
    return res.status(500).json({
      error: "Internal script generation error",
    });
  }
};
