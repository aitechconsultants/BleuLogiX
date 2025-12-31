import { RequestHandler } from "express";
import { z } from "zod";

// ============================================================================
// Leonardo AI Image Generation Route
// ============================================================================
// 
// REQUIRED ENV VARS:
//   LEONARDO_API_KEY - Your Leonardo AI API key (get from https://app.leonardo.ai/settings)
//
// ENDPOINTS:
//   POST /api/images/generate - Generate images from prompts
//   POST /api/images/extract-prompts - Extract image prompts from script
//
// LEONARDO API FLOW:
//   1. POST https://cloud.leonardo.ai/api/rest/v1/generations (returns generationId)
//   2. Poll GET https://cloud.leonardo.ai/api/rest/v1/generations/{id} until status=COMPLETE
//   3. Return generated image URLs
//
// ============================================================================

const LEONARDO_BASE_URL = "https://cloud.leonardo.ai/api/rest/v1";

// Polling configuration
const POLL_MAX_ATTEMPTS = 60; // Max polling attempts
const POLL_INTERVAL_MS = 2000; // 2 seconds between polls
const POLL_TIMEOUT_MS = POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS; // Total timeout ~120s

// Leonardo preset styles mapping
const STYLE_TO_PRESET: Record<string, string> = {
  realistic: "PHOTOGRAPHY",
  cinematic: "CINEMATIC",
  anime: "ANIME",
  illustration: "ILLUSTRATION",
  "3d": "RENDER_3D",
  sketch: "SKETCH_COLOR",
  dynamic: "DYNAMIC",
  creative: "CREATIVE",
  photography: "PHOTOGRAPHY",
  portrait: "PORTRAIT",
  // Fallback for unknown styles
  default: "DYNAMIC",
};

// Leonardo model IDs for different use cases
const STYLE_TO_MODEL: Record<string, string> = {
  // Leonardo Phoenix (recommended for most use cases)
  realistic: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Phoenix
  cinematic: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Phoenix
  photography: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Phoenix
  portrait: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Phoenix
  
  // Leonardo Anime XL for anime style
  anime: "e71a1c2f-4f80-4800-934f-2c68979d8cc8", // Leonardo Anime XL
  
  // Default model
  default: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Phoenix
};

// Episode schema for backward compatibility
const EpisodeSchema = z.object({
  text: z.string().optional(),
  script: z.string().optional(),
  content: z.string().optional(),
  title: z.string().optional(),
}).passthrough();

// Request validation schema - prompts are optional, derived from script/episodes
const GenerateImagesRequestSchema = z.object({
  // Primary: explicit prompts
  prompts: z.array(z.string().min(1).max(1000)).optional(),
  
  // Fallback sources for prompt derivation
  script: z.string().max(50000).optional(),
  episodes: z.array(EpisodeSchema).optional(),
  
  // Metadata (not used for prompts, but accepted for compatibility)
  scriptLength: z.number().optional(),
  episodesToGenerateCount: z.number().int().min(1).max(20).optional(),
  
  // Image generation options
  imageStyle: z.string().optional().default("realistic"),
  width: z.number().int().min(512).max(1536).optional().default(1024),
  height: z.number().int().min(512).max(1536).optional().default(1024),
  numImages: z.number().int().min(1).max(4).optional().default(1),
});

const ExtractPromptsRequestSchema = z.object({
  script: z.string().min(10).max(50000),
  episodesToGenerateCount: z.number().int().min(1).max(20).optional().default(1),
  imageStyle: z.string().optional().default("realistic"),
});

// Type definitions
interface LeonardoGenerationResponse {
  sdGenerationJob?: {
    generationId: string;
    apiCreditCost?: number;
  };
  error?: string;
  message?: string;
}

interface LeonardoGenerationStatus {
  generations_by_pk?: {
    status: "PENDING" | "COMPLETE" | "FAILED";
    generated_images?: Array<{
      id: string;
      url: string;
      nsfw?: boolean;
    }>;
    id?: string;
  };
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLeonardoApiKey(): string | null {
  return process.env.LEONARDO_API_KEY || null;
}

function getPresetStyle(imageStyle: string): string {
  const normalized = imageStyle.toLowerCase().trim();
  return STYLE_TO_PRESET[normalized] || STYLE_TO_PRESET.default;
}

function getModelId(imageStyle: string): string {
  const normalized = imageStyle.toLowerCase().trim();
  return STYLE_TO_MODEL[normalized] || STYLE_TO_MODEL.default;
}

async function createLeonardoGeneration(
  prompt: string,
  options: {
    imageStyle: string;
    width: number;
    height: number;
    numImages: number;
  }
): Promise<{ generationId: string } | { error: string; status: number }> {
  const apiKey = getLeonardoApiKey();
  if (!apiKey) {
    return { error: "Leonardo API key not configured", status: 503 };
  }

  const presetStyle = getPresetStyle(options.imageStyle);
  const modelId = getModelId(options.imageStyle);

  const requestBody = {
    prompt,
    modelId,
    presetStyle,
    width: options.width,
    height: options.height,
    num_images: options.numImages,
    alchemy: true, // Enable Alchemy for better quality
    guidance_scale: 7,
    num_inference_steps: 30,
    negative_prompt: "blurry, low quality, distorted, watermark, text, logo",
  };

  try {
    const response = await fetch(`${LEONARDO_BASE_URL}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { error?: string; message?: string } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      console.error("[Leonardo] Generation request failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Map Leonardo errors to appropriate status codes
      if (response.status === 401 || response.status === 403) {
        return { error: "Leonardo API authentication failed", status: 401 };
      }
      if (response.status === 429) {
        return { error: "Leonardo API rate limit exceeded", status: 429 };
      }
      if (response.status === 400) {
        return {
          error: `Leonardo API validation error: ${errorData.message || errorData.error || "Invalid request"}`,
          status: 400,
        };
      }

      return {
        error: `Leonardo API error: ${errorData.message || errorData.error || response.statusText}`,
        status: response.status,
      };
    }

    const data: LeonardoGenerationResponse = await response.json();

    if (!data.sdGenerationJob?.generationId) {
      console.error("[Leonardo] No generation ID in response:", data);
      return { error: "Leonardo API returned no generation ID", status: 500 };
    }

    return { generationId: data.sdGenerationJob.generationId };
  } catch (err) {
    console.error("[Leonardo] Network error creating generation:", err);
    return { error: `Network error: ${(err as Error).message}`, status: 500 };
  }
}

async function pollLeonardoGeneration(
  generationId: string,
  maxAttempts = POLL_MAX_ATTEMPTS,
  intervalMs = POLL_INTERVAL_MS
): Promise<{ images: Array<{ id: string; url: string }> } | { error: string; status: number; leonardoError?: unknown }> {
  const apiKey = getLeonardoApiKey();
  if (!apiKey) {
    return { error: "Leonardo API key not configured", status: 503 };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${LEONARDO_BASE_URL}/generations/${generationId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Leonardo] Poll request failed:", {
          attempt,
          status: response.status,
          error: errorText,
        });

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          return { error: "Leonardo API authentication failed", status: 401 };
        }

        // Continue polling on temporary errors
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
          continue;
        }

        return { error: `Failed to poll generation status`, status: 500 };
      }

      const data: LeonardoGenerationStatus = await response.json();
      const generation = data.generations_by_pk;

      if (!generation) {
        console.error("[Leonardo] Generation not found:", generationId);
        return { error: "Generation not found", status: 404 };
      }

      if (generation.status === "COMPLETE") {
        const images =
          generation.generated_images?.map((img) => ({
            id: img.id,
            url: img.url,
          })) || [];

        if (images.length === 0) {
          return { error: "Generation completed but no images returned", status: 500 };
        }

        return { images };
      }

      if (generation.status === "FAILED") {
        console.error("[Leonardo] Generation failed:", { generationId, generation });
        return { 
          error: "Leonardo image generation failed", 
          status: 500,
          leonardoError: generation
        };
      }

      // Status is PENDING, continue polling
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    } catch (err) {
      console.error("[Leonardo] Network error polling generation:", err);

      // Continue polling on network errors
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      return { error: `Network error: ${(err as Error).message}`, status: 500 };
    }
  }

  return { error: `Generation timed out after ${POLL_TIMEOUT_MS / 1000}s (${maxAttempts} polls)`, status: 504 };
}

// ============================================================================
// Route Handlers
// ============================================================================

export const handleGenerateImages: RequestHandler = async (req, res) => {
  const correlationId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Check Leonardo API key
  if (!getLeonardoApiKey()) {
    console.error(`[${correlationId}] LEONARDO_API_KEY not configured`);
    res.status(503).json({
      error: "Image generation service not configured",
      details: "LEONARDO_API_KEY environment variable is not set",
      correlationId,
    });
    return;
  }

  // Validate request body
  const parseResult = GenerateImagesRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.error(`[${correlationId}] Invalid request:`, parseResult.error.errors);
    res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      correlationId,
    });
    return;
  }

  const { 
    prompts: explicitPrompts, 
    script, 
    episodes, 
    episodesToGenerateCount,
    imageStyle, 
    width, 
    height, 
    numImages 
  } = parseResult.data;

  // Derive prompts if not explicitly provided
  const derivedPrompts = derivePromptsFromPayload({
    prompts: explicitPrompts,
    script,
    episodes,
    episodesToGenerateCount,
    imageStyle,
  });

  if ("error" in derivedPrompts) {
    console.error(`[${correlationId}] Prompt derivation failed:`, derivedPrompts);
    res.status(400).json({
      error: "Unable to derive image prompts",
      details: derivedPrompts.error,
      missingFields: derivedPrompts.missingFields,
      hint: "Provide one of: prompts[], script, or episodes[].text",
      correlationId,
    });
    return;
  }

  const prompts = derivedPrompts.prompts;
  console.log(`[${correlationId}] Derived ${prompts.length} prompts, style: ${imageStyle}`);

  console.log(`[${correlationId}] Generating ${prompts.length} images with style: ${imageStyle}`);

  try {
    const results: Array<{
      prompt: string;
      images?: Array<{ id: string; url: string }>;
      error?: string;
    }> = [];

    // Process prompts sequentially to avoid rate limits
    for (const prompt of prompts) {
      // Create generation
      const createResult = await createLeonardoGeneration(prompt, {
        imageStyle,
        width,
        height,
        numImages,
      });

      if ("error" in createResult) {
        results.push({ prompt, error: createResult.error });
        continue;
      }

      // Poll for completion
      const pollResult = await pollLeonardoGeneration(createResult.generationId);

      if ("error" in pollResult) {
        results.push({ prompt, error: pollResult.error });
        continue;
      }

      results.push({ prompt, images: pollResult.images });
    }

    // Check if all failed
    const allFailed = results.every((r) => r.error);
    if (allFailed) {
      res.status(500).json({
        error: "All image generations failed",
        results,
        correlationId,
      });
      return;
    }

    res.json({
      success: true,
      results,
      correlationId,
    });
  } catch (err) {
    console.error(`[${correlationId}] Unexpected error:`, err);
    res.status(500).json({
      error: "Unexpected error during image generation",
      details: (err as Error).message,
      correlationId,
    });
  }
};

export const handleExtractImagePrompts: RequestHandler = async (req, res) => {
  const correlationId = `extract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Validate request body
  const parseResult = ExtractPromptsRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.error(`[${correlationId}] Invalid request:`, parseResult.error.errors);
    res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      correlationId,
    });
    return;
  }

  const { script, episodesToGenerateCount, imageStyle } = parseResult.data;

  // Extract scene descriptions from script
  // This is a simple extraction - can be enhanced with AI later
  const scenes = extractSceneDescriptions(script, episodesToGenerateCount);
  
  // Format prompts for the specified image style
  const prompts = scenes.map((scene) => formatPromptForStyle(scene, imageStyle));

  res.json({
    success: true,
    prompts,
    imageStyle,
    correlationId,
  });
};

// ============================================================================
// Prompt Derivation (Backward Compatibility Layer)
// ============================================================================

interface PromptDerivationInput {
  prompts?: string[];
  script?: string;
  episodes?: Array<{ text?: string; script?: string; content?: string; title?: string }>;
  episodesToGenerateCount?: number;
  imageStyle: string;
}

interface PromptDerivationSuccess {
  prompts: string[];
  source: "explicit" | "script" | "episodes";
}

interface PromptDerivationError {
  error: string;
  missingFields: string[];
}

/**
 * Derives image prompts from request payload.
 * Priority: 1) explicit prompts, 2) script text, 3) episodes[].text
 */
function derivePromptsFromPayload(
  input: PromptDerivationInput
): PromptDerivationSuccess | PromptDerivationError {
  const { prompts, script, episodes, episodesToGenerateCount = 1, imageStyle } = input;

  // Priority 1: Use explicit prompts if provided
  if (prompts && prompts.length > 0) {
    return { prompts, source: "explicit" };
  }

  // Priority 2: Derive from script text
  if (script && script.trim().length > 0) {
    const scenes = extractSceneDescriptions(script, episodesToGenerateCount);
    const formattedPrompts = scenes.map((scene) => formatPromptForStyle(scene, imageStyle));
    return { prompts: formattedPrompts, source: "script" };
  }

  // Priority 3: Derive from episodes
  if (episodes && episodes.length > 0) {
    const episodeTexts = episodes
      .map((ep) => ep.text || ep.script || ep.content || ep.title || "")
      .filter((text) => text.trim().length > 0);

    if (episodeTexts.length > 0) {
      const formattedPrompts = episodeTexts
        .slice(0, episodesToGenerateCount)
        .map((text) => formatPromptForStyle(text.slice(0, 500), imageStyle));
      return { prompts: formattedPrompts, source: "episodes" };
    }
  }

  // No valid source found - return structured error
  return {
    error: "No prompt source available. Provide prompts[], script, or episodes with text.",
    missingFields: ["prompts", "script", "episodes[].text"],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function extractSceneDescriptions(script: string, count: number): string[] {
  // Split script into sentences
  const sentences = script
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return [script.slice(0, 500)];
  }

  // Select evenly distributed sentences
  const step = Math.max(1, Math.floor(sentences.length / count));
  const selected: string[] = [];

  for (let i = 0; i < sentences.length && selected.length < count; i += step) {
    selected.push(sentences[i]);
  }

  // Ensure we have at least one
  if (selected.length === 0) {
    selected.push(sentences[0]);
  }

  return selected;
}

function formatPromptForStyle(scene: string, imageStyle: string): string {
  const styleModifiers: Record<string, string> = {
    realistic: "photorealistic, high detail, 8k, professional photography",
    cinematic: "cinematic lighting, dramatic, movie scene, film grain",
    anime: "anime style, vibrant colors, detailed anime art",
    illustration: "digital illustration, artistic, detailed artwork",
    "3d": "3D render, octane render, volumetric lighting",
    sketch: "pencil sketch, detailed line art, artistic sketch",
    photography: "professional photography, natural lighting, high resolution",
    portrait: "portrait photography, studio lighting, detailed face",
    dynamic: "dynamic composition, vibrant, energetic",
    creative: "creative art, imaginative, unique style",
  };

  const modifier = styleModifiers[imageStyle.toLowerCase()] || styleModifiers.realistic;
  
  // Clean and truncate scene
  const cleanScene = scene.replace(/[^\w\s,.-]/g, " ").trim().slice(0, 400);

  return `${cleanScene}, ${modifier}`;
}
