import { RequestHandler } from "express";
import { VoiceService } from "../services/voiceService";
import { logError } from "../logging";

const voiceService = new VoiceService();

export const handleGetVoices: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    console.log(`[voices] GET /api/voices - correlationId: ${correlationId}`);
    const voices = voiceService.getAvailableVoices();
    console.log(`[voices] Returning ${voices.length} voices`);
    res.json({
      voices,
      count: voices.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[voices] Error fetching voices:`, error);
    logError(
      { correlationId },
      "Failed to fetch voices",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch voices",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleGetVoicePreview: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { voiceId } = req.params;
  const { text } = req.query as { text?: string };

  try {
    console.log(
      `[voices] GET /api/voices/${voiceId}/preview - correlationId: ${correlationId}`,
    );

    if (!voiceId) {
      console.warn(`[voices] Missing voiceId parameter`);
      return res.status(400).json({
        error: "voiceId is required",
        correlationId,
      });
    }

    const voice = voiceService.getVoiceById(voiceId);
    if (!voice) {
      console.warn(`[voices] Voice not found: ${voiceId}`);
      return res.status(404).json({
        error: "Voice not found",
        correlationId,
      });
    }

    const previewText =
      text ||
      `Hello! This is a preview of the ${voice.name} voice. You can use this voice for your video narration.`;

    console.log(
      `[voices] Generating preview for voice: ${voiceId} (${voice.name})`,
    );
    const audioBuffer = await voiceService.generateVoicePreview(
      voiceId,
      previewText,
    );

    console.log(
      `[voices] Sending audio preview, size: ${audioBuffer.length} bytes`,
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="voice-preview-${voiceId}.mp3"`,
    );
    res.send(audioBuffer);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[voices] Error generating preview for ${voiceId}:`, error);
    logError(
      { correlationId },
      "Failed to generate voice preview",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to generate voice preview",
      message: errorMsg,
      correlationId,
    });
  }
};
