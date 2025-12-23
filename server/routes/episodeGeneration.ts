import { RequestHandler } from "express";
import { OpenAI } from "openai";
import { logError } from "../logging";

interface Episode {
  seriesName: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName: string;
  description?: string;
}

export const handleGenerateEpisodes: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({
      error: "Prompt is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[episodes] POST /api/episodes/generate - prompt length: ${prompt.length}, correlationId: ${correlationId}`,
    );

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at generating creative TV series and episode ideas based on user descriptions.
          
Your task is to generate a list of episodes that fit the user's description.

Guidelines:
- Generate 3-8 episodes based on the description
- Each episode should have a series name, optional season/episode numbers, and a creative name
- Include brief descriptions for each episode
- Make episodes creative and engaging
- Format response as valid JSON

Return ONLY valid JSON in this exact format:
{
  "episodes": [
    {
      "seriesName": "Series Name",
      "seasonNumber": 1,
      "episodeNumber": 1,
      "episodeName": "Episode Title",
      "description": "Brief episode description"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Generate episodes based on this description: ${prompt}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn("[episodes] No content in GPT response");
      return res.status(500).json({
        error: "Failed to generate episodes",
        correlationId,
      });
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("[episodes] No JSON object found in response");
        return res.status(500).json({
          error: "Failed to parse episode generation response",
          correlationId,
        });
      }

      const result = JSON.parse(jsonMatch[0]);
      const episodes: Episode[] = result.episodes || [];

      if (!Array.isArray(episodes) || episodes.length === 0) {
        console.warn("[episodes] No valid episodes in parsed response");
        return res.status(500).json({
          error: "Failed to generate valid episodes",
          correlationId,
        });
      }

      console.log(
        `[episodes] Successfully generated ${episodes.length} episodes`,
      );

      res.json({
        success: true,
        episodes,
        count: episodes.length,
      });
    } catch (parseError) {
      console.warn(
        "[episodes] Failed to parse episode generation JSON:",
        parseError,
      );
      return res.status(500).json({
        error: "Failed to parse generated episodes",
        message:
          parseError instanceof Error ? parseError.message : String(parseError),
        correlationId,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[episodes] Error generating episodes:`, error);
    logError(
      { correlationId },
      "Failed to generate episodes",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to generate episodes",
      message: errorMsg,
      correlationId,
    });
  }
};
