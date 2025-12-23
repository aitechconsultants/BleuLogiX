import { RequestHandler } from "express";
import { VoiceService } from "../services/voiceService";
import { logError } from "../logging";

const voiceService = new VoiceService();

export const handleGetVoices: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const voices = voiceService.getAvailableVoices();
    res.json({
      voices,
      count: voices.length,
    });
  } catch (error) {
    logError(
      { correlationId },
      "Failed to fetch voices",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to fetch voices",
      correlationId,
    });
  }
};

export const handleGetVoicePreview: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const { voiceId } = req.params;
    const { text } = req.query as { text?: string };

    if (!voiceId) {
      return res.status(400).json({
        error: "voiceId is required",
        correlationId,
      });
    }

    const voice = voiceService.getVoiceById(voiceId);
    if (!voice) {
      return res.status(404).json({
        error: "Voice not found",
        correlationId,
      });
    }

    const previewText =
      text ||
      `Hello! This is a preview of the ${voice.name} voice. You can use this voice for your video narration.`;

    const audioBuffer = await voiceService.generateVoicePreview(
      voiceId,
      previewText,
    );

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="voice-preview-${voiceId}.mp3"`,
    );
    res.send(audioBuffer);
  } catch (error) {
    logError(
      { correlationId },
      "Failed to generate voice preview",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to generate voice preview",
      correlationId,
    });
  }
};
