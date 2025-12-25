import { OpenAI } from "openai";
import { cleanScriptForVoiceover } from "../../shared/api";

interface ImagePrompt {
  description: string;
  context: string;
  index: number;
  voiceoverScript: string;
}

interface LeonardoGenerationRequest {
  prompt: string;
  num_images?: number;
  model_id?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  seed?: number;
  public?: boolean;
}

interface LeonardoSDJob {
  generationId: string;
}

interface LeonardoCreateResponse {
  sdGenerationJob: LeonardoSDJob;
}

interface LeonardoGeneration {
  id: string;
  status: string;
  generated_images?: Array<{
    id: string;
    url: string;
  }>;
}

export class ImageGenerationService {
  private openai: OpenAI | null = null;
  private leonardoApiKey: string | null = null;
  private leonardoBaseUrl: string = "https://cloud.leonardo.ai/api/rest/v1";

  constructor() {
    this.leonardoApiKey = process.env.LEONARDO_API_KEY || null;
    if (this.leonardoApiKey) {
      console.log(
        "[imageGen] Leonardo API key configured (length:",
        this.leonardoApiKey.length,
        ")",
      );
    } else {
      console.warn(
        "[imageGen] Leonardo API key NOT configured - process.env.LEONARDO_API_KEY is missing or empty",
      );
    }
  }

  private initializeOpenAI() {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
      }
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Get Leonardo.AI model ID based on image style
   */
  private getLeonardoModelId(imageStyle: string): string {
    // Map our style names to Leonardo model IDs
    const styleToModel: Record<string, string> = {
      realistic: "6bef9f1b-740f-4731-915a-8424467e9f7a", // Leonardo Vision (photorealistic)
      cinematic: "b63dcbd9-8f21-46d5-8e36-14490393bef0", // Cinematic
      "fine art": "e0cf4d76-13d3-4bcc-869c-8758c8c54d75", // Artistic
      fantasy: "f1929ea3-6033-4f59-aca5-d373518e2db0", // Creative
      drama: "b63dcbd9-8f21-46d5-8e36-14490393bef0", // Cinematic (good for drama)
      dark: "b63dcbd9-8f21-46d5-8e36-14490393bef0", // Cinematic (good for dark)
    };

    return styleToModel[imageStyle.toLowerCase()] || styleToModel.realistic;
  }

  /**
   * Map style to Leonardo preset style
   */
  private getLeonardoPresetStyle(imageStyle: string): string | undefined {
    const styleMap: Record<string, string> = {
      realistic: "PHOTOGRAPHY",
      cinematic: "CINEMATIC",
      "fine art": "PAINTING",
      fantasy: "FANTASY_ART",
      drama: "CINEMATIC",
      dark: "DARK_FANTASY",
    };

    return styleMap[imageStyle.toLowerCase()];
  }

  /**
   * Extract voiceover scripts for episodes
   * Uses the episode description as the voiceover script, cleaned of camera directions
   */
  private extractVoiceoverScriptsForEpisodes(
    episodes: any[],
  ): Map<number, string> {
    const voiceoverScripts = new Map<number, string>();

    // If we have episodes, create a combined voiceover script from their descriptions
    // Distribute them across image prompts
    const episodeDescriptions = episodes
      .map((ep) => ep.description)
      .filter((desc) => desc && typeof desc === "string")
      .join(" ");

    if (episodeDescriptions.trim()) {
      const cleanedScript = cleanScriptForVoiceover(episodeDescriptions);
      // Store the combined voiceover script to be distributed across prompts
      voiceoverScripts.set(-1, cleanedScript);
    }

    return voiceoverScripts;
  }

  /**
   * Parse script to extract image/photo descriptions and corresponding voiceover
   * Uses AI to intelligently identify what visuals should accompany each section
   */
  async extractImagePromptsFromScript(
    script: string,
    episodes: any[] = [],
    imageStyle: string = "realistic",
  ): Promise<ImagePrompt[]> {
    this.initializeOpenAI();

    if ((!script || script.trim().length === 0) && episodes.length === 0) {
      return [];
    }

    // Extract voiceover scripts from episodes
    const episodeVoiceoverScripts =
      this.extractVoiceoverScriptsForEpisodes(episodes);
    const combinedEpisodeVoiceover = episodeVoiceoverScripts.get(-1) || "";

    const episodeContext =
      episodes.length > 0
        ? `\n\nContext - Selected Episodes:\n${episodes
            .map(
              (ep) =>
                `- ${ep.seriesName} ${ep.seasonNumber ? `S${ep.seasonNumber}` : ""}${
                  ep.episodeNumber ? `E${ep.episodeNumber}` : ""
                } ${ep.episodeName ? `- ${ep.episodeName}` : ""} ${
                  ep.description ? `(${ep.description})` : ""
                }`,
            )
            .join(
              "\n",
            )}\n\nUse these episodes to inform the visual style and context of the generated images.`
        : "";

    try {
      const styleGuideMap: Record<string, string> = {
        realistic:
          "photorealistic, documentary style, natural lighting, authentic details",
        "fine art": "oil painting style, artistic composition, museum quality",
        cinematic:
          "cinematic composition, dramatic lighting, film noir or golden hour cinematography",
        fantasy:
          "fantasy world, magical elements, mystical atmosphere, vibrant colors",
        drama:
          "dramatic lighting, emotional intensity, theatrical composition, high contrast",
        dark: "dark moody atmosphere, low key lighting, noir style, mysterious tone",
      };

      const styleGuide =
        styleGuideMap[imageStyle.toLowerCase()] || styleGuideMap.realistic;

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing scripts for video production and identifying visual requirements for Leonardo.AI image generation.

Your task is to analyze a video script and identify distinct visual scenes/shots that should be created.
Return a JSON array of highly detailed image prompts optimized for Leonardo.AI that would visually represent the key moments in the script.

CRITICAL STYLE REQUIREMENTS: All images MUST be in this exact style: ${styleGuide}

Leonardo.AI Optimization Tips:
- Be very specific and descriptive with composition and lighting details
- Use action-oriented language that Leonardo understands well
- Include art medium/style references (e.g., "cinematic 4K", "digital painting", "professional photography")
- Mention color palette and atmosphere explicitly
- Leonardo performs better with rich detail - use 200-300 character descriptions

Detailed Guidelines for ${imageStyle} style:
${
  imageStyle.toLowerCase() === "realistic"
    ? "- Use Leonardo's photography presets: 'professional photograph', 'shot on Sony A7R', '4K resolution', 'RAW quality'\n- Include lighting: 'studio lighting', 'natural daylight', 'golden hour', 'soft diffused light'\n- Add material details: 'crisp details', 'sharp focus', 'bokeh background', 'textured surfaces'\n- Specify mood: 'documentary style', 'authentic', 'candid moment'"
    : imageStyle.toLowerCase() === "cinematic"
      ? "- Use cinematic language: 'cinematic 4K', '35mm film', 'theatrical color grading'\n- Include cinematography: 'golden hour', 'dramatic shadows', 'dynamic depth', 'color grading'\n- Add production quality: 'blockbuster cinematography', 'professional lighting setup', 'cinema color palette'\n- Specify mood: 'epic', 'dramatic tension', 'cinematic depth of field'"
      : "- Be specific about the style's visual qualities\n- Include relevant artistic descriptors that Leonardo responds well to\n- Emphasize texture, lighting, and color in the style"
}

General Requirements:
- Generate 3-8 key visual moments based on script length and content
- Each prompt should be EXTREMELY DETAILED (250+ characters) and highly specific
- Include specific visual elements, composition, lighting, color palette, and atmosphere
- Never use generic descriptions - be precise and vivid
- Create prompts that are distinct and complementary
- Ensure all prompts emphasize the ${imageStyle} style throughout${
              episodes.length > 0
                ? "\n- If episodes are provided, align the visuals with the episode content and themes"
                : ""
            }
- Use rich, evocative language that inspires high-quality AI generation

Return ONLY valid JSON in this exact format:
[
  {
    "description": "extremely detailed visual description for Leonardo.AI incorporating ${imageStyle} style, specific details, composition, lighting, and atmosphere",
    "context": "brief explanation of why this visual is needed",
    "index": 0,
    "voiceoverScript": "the specific voiceover text that should be spoken for this visual moment"
  }
]`,
          },
          {
            role: "user",
            content: script?.trim()
              ? `Analyze this script and extract highly detailed visual requirements in ${imageStyle} style:\n\n${script}${episodeContext}`
              : `Based on the selected episodes${episodeContext}\n\nGenerate visual descriptions for images that would represent key scenes and moments from these episodes in ${imageStyle} style.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn(
          "[imageGen] No content in GPT response, using default prompts",
        );
        return this.generateDefaultPrompts(script);
      }

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn(
            "[imageGen] No JSON array found in response, using default prompts",
          );
          console.log(
            "[imageGen] GPT response preview:",
            content.substring(0, 200),
          );
          return this.generateDefaultPrompts(script);
        }

        let prompts = JSON.parse(jsonMatch[0]) as ImagePrompt[];
        console.log(
          `[imageGen] Successfully extracted ${prompts.length} prompts from GPT`,
        );

        // If we're working with episodes and have combined voiceover, distribute it across prompts
        if (
          combinedEpisodeVoiceover &&
          episodes.length > 0 &&
          prompts.length > 0
        ) {
          const voiceoverSegments = this.distributeVoiceoverAcrossPrompts(
            combinedEpisodeVoiceover,
            prompts.length,
          );
          prompts = prompts.map((prompt, idx) => ({
            ...prompt,
            voiceoverScript:
              voiceoverSegments[idx] || prompt.voiceoverScript || "",
          }));
        }

        // Ensure all prompts have voiceoverScript field
        prompts = prompts.map((prompt) => ({
          ...prompt,
          voiceoverScript: prompt.voiceoverScript || "",
        }));

        return prompts.slice(0, 8);
      } catch (parseError) {
        console.warn(
          "[imageGen] Failed to parse image prompts JSON:",
          parseError,
        );
        console.log("[imageGen] Using default prompts as fallback");
        return this.generateDefaultPrompts(script);
      }
    } catch (error) {
      console.error("[imageGen] Error extracting image prompts:", error);
      console.log("[imageGen] Using default prompts as fallback");
      return this.generateDefaultPrompts(script);
    }
  }

  /**
   * Distribute voiceover script across multiple image prompts
   * Splits the script into roughly equal segments
   */
  private distributeVoiceoverAcrossPrompts(
    voiceoverScript: string,
    numPrompts: number,
  ): string[] {
    if (!voiceoverScript || numPrompts === 0) {
      return [];
    }

    if (numPrompts === 1) {
      return [voiceoverScript];
    }

    // Split script into sentences for better segmentation
    const sentences = voiceoverScript.match(/[^.!?]+[.!?]+/g) || [
      voiceoverScript,
    ];
    const segments: string[] = Array(numPrompts).fill("");
    let sentenceIdx = 0;

    // Distribute sentences across prompts as evenly as possible
    for (let i = 0; i < numPrompts && sentenceIdx < sentences.length; i++) {
      const sentencesPerPrompt = Math.ceil(
        (sentences.length - sentenceIdx) / (numPrompts - i),
      );
      const segmentSentences = sentences.slice(
        sentenceIdx,
        sentenceIdx + sentencesPerPrompt,
      );
      segments[i] = segmentSentences.join("").trim();
      sentenceIdx += sentencesPerPrompt;
    }

    return segments;
  }

  /**
   * Generate fallback prompts if AI extraction fails
   */
  private generateDefaultPrompts(script: string): ImagePrompt[] {
    const words = script?.trim() ? script.split(/\s+/).length : 0;
    // If no script, generate 6 images; otherwise base on script length
    const numImages = words > 0 ? Math.min(Math.ceil(words / 100), 6) : 6;

    const themes = [
      "professional business environment, shot on Sony A7R, sharp focus, natural daylight, 4K resolution, crisp details, bokeh background",
      "modern technology workspace, professional photograph, studio lighting setup, high-end production quality, vibrant colors, modern aesthetic",
      "creative collaboration, natural daylight, journalistic photography, authentic candid moment, documentary style, warm lighting",
      "product showcase, professional product photography, studio lighting, RAW quality, sharp focus, textured details, premium presentation",
      "success and growth, cinematic 4K, golden hour lighting, dynamic depth of field, dramatic shadows, cinema color grading",
      "team working together, professional environment, natural interaction, high-resolution, authentic setting, collaborative atmosphere",
    ];

    // Distribute script across prompts
    const voiceoverSegments = script?.trim()
      ? this.distributeVoiceoverAcrossPrompts(script, numImages)
      : Array(numImages).fill("");

    return Array.from({ length: numImages }, (_, i) => ({
      description: `${themes[i % themes.length]}, high quality, visually engaging, professional production`,
      context: `Visual segment ${i + 1} for the video narrative`,
      index: i,
      voiceoverScript: voiceoverSegments[i] || "",
    }));
  }

  /**
   * Generate images using Leonardo.AI based on prompts
   */
  async generateImages(
    prompts: ImagePrompt[],
    imageStyle: string = "realistic",
  ): Promise<string[]> {
    return this.generateImagesWithLeonardo(prompts, imageStyle);
  }

  /**
   * Generate images using Leonardo.AI with async job polling
   * Creates a generation job and polls for completion with timeout protection
   */
  private async generateImagesWithLeonardo(
    prompts: ImagePrompt[],
    imageStyle: string = "realistic",
  ): Promise<string[]> {
    console.log(
      "[imageGen] generateImagesWithLeonardo called with",
      prompts.length,
      "prompts",
    );

    if (!prompts || prompts.length === 0) {
      console.log("[imageGen] No prompts provided, returning empty array");
      return [];
    }

    if (!this.leonardoApiKey) {
      console.error("[imageGen] Leonardo API key not configured");
      return [];
    }

    console.log(
      "[imageGen] Starting Leonardo image generation with API key",
      this.leonardoApiKey.substring(0, 8) + "...",
    );

    const imageUrls: string[] = [];
    const modelId = this.getLeonardoModelId(imageStyle);
    const presetStyle = this.getLeonardoPresetStyle(imageStyle);
    let firstGenerationId: string | null = null;

    console.log("[imageGen] Using model:", modelId, "preset:", presetStyle);

    for (let promptIdx = 0; promptIdx < prompts.length; promptIdx++) {
      const prompt = prompts[promptIdx];
      try {
        console.log(
          `[imageGen] ===== Starting image generation ${promptIdx + 1}/${prompts.length} for prompt: ${prompt.description.substring(0, 50)}...`,
        );

        // Create generation request with Leonardo API correct field names
        const generationRequest: LeonardoGenerationRequest = {
          prompt: prompt.description,
          num_images: 1,
          model_id: modelId,
          width: 1024,
          height: 1024,
          guidance_scale: 7,
          public: false,
        };

        console.log(
          "[imageGen] Submitting generation request to:",
          `${this.leonardoBaseUrl}/generations`,
        );
        console.log(
          "[imageGen] Request body:",
          JSON.stringify(generationRequest).substring(0, 300),
        );
        console.log(
          "[imageGen] Authorization header will use API key:",
          this.leonardoApiKey?.substring(0, 8) + "...",
        );

        // Submit generation job with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        let createResponse;
        try {
          createResponse = await fetch(`${this.leonardoBaseUrl}/generations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.leonardoApiKey!}`,
            },
            body: JSON.stringify(generationRequest),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
            console.error(
              `[imageGen] Leonardo API request timeout (15s) for prompt:`,
              prompt.description.substring(0, 50),
            );
          } else {
            console.error(
              `[imageGen] Leonardo API fetch error:`,
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            );
          }
          continue;
        }
        clearTimeout(timeoutId);

        console.log(
          "[imageGen] Creation response status:",
          createResponse.status,
        );

        if (!createResponse.ok) {
          let errorData: any = {};
          let errorText = "";
          try {
            errorText = await createResponse.text();
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { rawText: errorText };
            }
          } catch (e) {
            errorData = { parseError: String(e) };
          }
          console.error(
            `[imageGen] ❌ Leonardo API error (create): status=${createResponse.status}`,
          );
          console.error(
            "[imageGen] Response error data:",
            JSON.stringify(errorData).substring(0, 500),
          );
          console.error("[imageGen] Skipping prompt and continuing to next...");
          continue;
        }

        let createData: any;
        let createDataText = "";
        try {
          createDataText = await createResponse.text();
          createData = JSON.parse(createDataText) as LeonardoCreateResponse;
        } catch (parseErr) {
          console.error(
            "[imageGen] Failed to parse creation response:",
            parseErr,
          );
          console.log(
            "[imageGen] Raw creation response:",
            createDataText.substring(0, 500),
          );
          continue;
        }

        console.log(
          "[imageGen] Creation response data:",
          JSON.stringify(createData).substring(0, 500),
        );

        // Try multiple possible paths for the generation ID
        let generationId =
          createData?.sdGenerationJob?.generationId ||
          createData?.generation_id ||
          createData?.id;

        if (!generationId) {
          console.error(
            "[imageGen] ❌ No generation ID returned from Leonardo!",
          );
          console.error(
            "[imageGen] Response keys:",
            createData ? Object.keys(createData) : "null",
          );
          console.error(
            "[imageGen] Full response:",
            JSON.stringify(createData).substring(0, 500),
          );
          console.error(
            "[imageGen] sdGenerationJob structure:",
            JSON.stringify(createData?.sdGenerationJob),
          );
          continue;
        }

        console.log(
          "[imageGen] ✓ Generation job created with ID:",
          generationId,
        );

        // Track first generation ID for response
        if (!firstGenerationId) {
          firstGenerationId = generationId;
        }

        // Poll for completion (with timeout)
        const maxWaitTime = 45000; // 45 seconds max wait
        const pollInterval = 1000; // 1 second between polls
        const startTime = Date.now();
        let imageUrl: string | null = null;
        let pollCount = 0;

        while (Date.now() - startTime < maxWaitTime) {
          pollCount++;
          const pollController = new AbortController();
          const pollTimeoutId = setTimeout(() => pollController.abort(), 10000); // 10 second timeout per poll

          let statusResponse;
          try {
            statusResponse = await fetch(
              `${this.leonardoBaseUrl}/generations/${generationId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${this.leonardoApiKey!}`,
                },
                signal: pollController.signal,
              },
            );
          } catch (pollFetchErr) {
            clearTimeout(pollTimeoutId);
            if (
              pollFetchErr instanceof Error &&
              pollFetchErr.name === "AbortError"
            ) {
              console.error(
                `[imageGen] Leonardo status check timeout (10s) on poll #${pollCount}`,
              );
            } else {
              console.error(
                `[imageGen] Leonardo status fetch error:`,
                pollFetchErr instanceof Error
                  ? pollFetchErr.message
                  : String(pollFetchErr),
              );
            }
            break;
          }
          clearTimeout(pollTimeoutId);

          console.log(
            `[imageGen] Poll #${pollCount} status response: ${statusResponse.status}`,
          );

          if (!statusResponse.ok) {
            console.error(
              "[imageGen] Failed to check generation status:",
              statusResponse.status,
            );
            let errorBody = "";
            try {
              errorBody = await statusResponse.text();
            } catch (e) {
              errorBody = "Could not read response body";
            }
            console.error("[imageGen] Status check error body:", errorBody);
            break;
          }

          let statusData: any;
          let statusText = "";
          try {
            statusText = await statusResponse.text();
            statusData = JSON.parse(statusText);
          } catch (parseErr) {
            console.error(
              "[imageGen] Failed to parse status response:",
              parseErr,
            );
            console.error(
              "[imageGen] Raw status response text:",
              statusText.substring(0, 500),
            );
            break;
          }

          console.log(
            "[imageGen] Status response data:",
            JSON.stringify(statusData).substring(0, 300),
          );

          // Leonardo API returns a flat structure at generations_by_pk or directly
          let generation: LeonardoGeneration | null = null;

          if (statusData.generations_by_pk) {
            generation = statusData.generations_by_pk;
          } else if (statusData.id && statusData.status) {
            // Direct generation response
            generation = statusData;
          }

          if (!generation) {
            console.error(
              "[imageGen] Invalid response structure. Response keys:",
              Object.keys(statusData || {}),
            );
            break;
          }

          console.log(
            `[imageGen] Generation ${generationId} status: ${generation.status}`,
          );

          if (generation.status === "COMPLETE") {
            console.log(
              "[imageGen] Generation complete. Checking for images...",
            );

            const images = generation.generated_images || [];
            if (images.length > 0) {
              imageUrl = images[0].url;
              console.log(
                `[imageGen] ✓ Image URL retrieved: ${imageUrl.substring(0, 60)}...`,
              );
            } else {
              console.warn(
                "[imageGen] ⚠️ Generation complete but generated_images is empty",
                "Images array:",
                JSON.stringify(images),
              );
            }
            break;
          } else if (
            generation.status === "FAILED" ||
            generation.status === "REJECTED"
          ) {
            console.error(
              `[imageGen] Generation ${generationId} failed with status: ${generation.status}`,
            );
            break;
          }

          // Wait before polling again
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        if (imageUrl) {
          imageUrls.push(imageUrl);
          console.log(
            `[imageGen] ✓ Successfully added image ${imageUrls.length}/${prompts.length}`,
          );
        } else {
          console.warn(
            `[imageGen] ⚠️ Timeout waiting for generation ${generationId} or no image URL returned after polling`,
          );
        }
      } catch (error) {
        console.error(
          `[imageGen] ❌ Exception during image generation for prompt ${promptIdx + 1}:`,
          error instanceof Error ? error.message : String(error),
        );
        if (error instanceof Error) {
          console.error(
            "[imageGen] Stack trace:",
            error.stack?.substring(0, 300),
          );
        }
      }
    }

    console.log(
      `[imageGen] ===== FINAL RESULT: Generated ${imageUrls.length} images out of ${prompts.length} prompts =====`,
    );
    return imageUrls;
  }

  /**
   * Calculate credit cost for image generation
   * Leonardo.AI typically costs 10 tokens per image
   */
  calculateImageGenerationCost(imageCount: number): number {
    const costPerImage = 10; // Leonardo tokens per image (varies by model, this is approximate)
    return imageCount * costPerImage;
  }

  /**
   * Full pipeline: extract prompts from script and generate images
   */
  async generateImagesFromScript(
    script: string,
    episodes: any[] = [],
    imageStyle: string = "realistic",
  ): Promise<{
    prompts: ImagePrompt[];
    imageUrls: string[];
    creditCost: number;
  }> {
    console.log(
      `[imageGen] Starting image generation pipeline with style: ${imageStyle}`,
    );

    const prompts = await this.extractImagePromptsFromScript(
      script,
      episodes,
      imageStyle,
    );
    console.log(`[imageGen] Extracted ${prompts.length} image prompts`);

    const imageUrls = await this.generateImages(prompts, imageStyle);
    console.log(`[imageGen] Generated ${imageUrls.length} images`);

    const creditCost = this.calculateImageGenerationCost(imageUrls.length);

    return {
      prompts,
      imageUrls,
      creditCost,
    };
  }
}
