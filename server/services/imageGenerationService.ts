import { OpenAI } from "openai";

interface ImagePrompt {
  description: string;
  context: string;
  index: number;
}

export class ImageGenerationService {
  private openai: OpenAI | null = null;

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
   * Parse script to extract image/photo descriptions
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
            content: `You are an expert at analyzing scripts for video production and identifying visual requirements for DALL-E 3.

Your task is to analyze a video script and identify distinct visual scenes/shots that should be created.
Return a JSON array of highly detailed image prompts that would visually represent the key moments in the script.

CRITICAL STYLE REQUIREMENTS: All images MUST be in this exact style: ${styleGuide}

Detailed Guidelines for ${imageStyle} style:
${
  imageStyle.toLowerCase() === "realistic"
    ? "- Use professional photography language: 'professional photograph', '4K, high-resolution', 'sharp focus', 'RAW quality'\n- Include specific camera techniques: 'shot on professional DSLR', 'natural daylight', 'studio lighting'\n- Add material/texture descriptions: 'detailed textures', 'authentic surfaces', 'realistic proportions'\n- Specify atmosphere: 'documentary style', 'journalistic photography', 'candid moment'"
    : imageStyle.toLowerCase() === "cinematic"
      ? "- Use film language: 'cinematic', '35mm film', 'theatrical lighting', 'movie scene'\n- Include specific cinematography: 'golden hour', 'dramatic shadows', 'dynamic composition', 'film noir elements'\n- Add production quality: 'blockbuster quality', 'professional cinematography', 'high-end production'\n- Specify mood: 'epic', 'dramatic tension', 'visual storytelling', 'cinematic depth'"
      : "- Be specific about the style's visual qualities\n- Include relevant technical/artistic descriptors\n- Emphasize the unique aesthetic characteristics"
}

General Requirements:
- Generate 3-8 key visual moments based on script length and content
- Each prompt should be EXTREMELY DETAILED (200+ characters) and highly specific
- Always begin with style specification: e.g., "Professional photograph" or "Cinematic shot"
- Include specific visual elements, composition, lighting, color palette, materials
- Never use generic descriptions - be precise and visual
- Create prompts that are distinct and complementary
- Ensure all prompts emphasize the ${imageStyle} style throughout${
              episodes.length > 0
                ? "\n- If episodes are provided, align the visuals with the episode content and themes"
                : ""
            }
- Format for DALL-E 3 optimization: clear, detailed, style-specific language

Return ONLY valid JSON in this exact format:
[
  {
    "description": "extremely detailed visual description incorporating ${imageStyle} style, specific details, composition, and lighting",
    "context": "brief explanation of why this visual is needed",
    "index": 0
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

        const prompts = JSON.parse(jsonMatch[0]) as ImagePrompt[];
        console.log(
          `[imageGen] Successfully extracted ${prompts.length} prompts from GPT`,
        );
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
   * Generate fallback prompts if AI extraction fails
   */
  private generateDefaultPrompts(script: string): ImagePrompt[] {
    const words = script?.trim() ? script.split(/\s+/).length : 0;
    // If no script, generate 6 images; otherwise base on script length
    const numImages = words > 0 ? Math.min(Math.ceil(words / 100), 6) : 6;

    const themes = [
      "professional business environment, sharp focus, natural lighting, 4K resolution, detailed textures",
      "modern technology workspace, professional photograph, studio lighting, high-end production quality",
      "creative collaboration, natural daylight, journalistic photography, authentic moment, documentary style",
      "product showcase, product photography, professional lighting, RAW quality, studio setup, sharp details",
      "success and growth, cinematic composition, golden hour lighting, dynamic angles, professional quality",
      "team working together, professional environment, natural interaction, high-resolution, authentic setting",
    ];

    return Array.from({ length: numImages }, (_, i) => ({
      description: `Professional photograph: ${themes[i % themes.length]}, professional DSLR quality`,
      context: `Visual segment ${i + 1} for the video narrative`,
      index: i,
    }));
  }

  /**
   * Generate images using DALL-E 3 based on prompts
   */
  async generateImages(
    prompts: ImagePrompt[],
    imageStyle: string = "realistic",
  ): Promise<string[]> {
    this.initializeOpenAI();

    if (!prompts || prompts.length === 0) {
      return [];
    }

    const imageUrls: string[] = [];

    // Use "vivid" style for cinematic to enhance drama and contrast
    // Use "natural" for realistic to maintain authenticity
    const dallEStyle: "vivid" | "natural" =
      imageStyle.toLowerCase() === "cinematic" ? "vivid" : "natural";

    for (const prompt of prompts) {
      try {
        console.log(
          `[imageGen] Generating image (${imageStyle}) for: ${prompt.description.slice(0, 50)}...`,
        );

        const response = await this.openai!.images.generate({
          model: "dall-e-3",
          prompt: prompt.description,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: dallEStyle,
        });

        const imageUrl = response.data[0]?.url;
        if (imageUrl) {
          imageUrls.push(imageUrl);
          console.log(
            `[imageGen] Successfully generated image ${imageUrls.length}`,
          );
        }
      } catch (error) {
        console.error(`[imageGen] Failed to generate image for prompt:`, error);
      }
    }

    return imageUrls;
  }

  /**
   * Calculate credit cost for image generation
   * DALL-E 3 costs ~$0.04 per image
   */
  calculateImageGenerationCost(imageCount: number): number {
    const costPerImage = 4; // in credits
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
