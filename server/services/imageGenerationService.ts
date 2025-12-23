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
  ): Promise<ImagePrompt[]> {
    this.initializeOpenAI();

    if (!script || script.trim().length === 0) {
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
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing scripts for video production and identifying visual requirements.

Your task is to analyze a video script and identify distinct visual scenes/shots that should be created.
Return a JSON array of image prompts that would visually represent the key moments in the script.

Guidelines:
- Identify 3-8 key visual moments based on the script length and content
- Each prompt should be descriptive and cinematic
- Focus on action, emotion, and key narrative elements
- Create prompts that are distinct and complementary
- Format each prompt to work well with DALL-E 3${
              episodes.length > 0
                ? "\n- If episodes are provided, align the visuals with the episode content and themes"
                : ""
            }

Return ONLY valid JSON in this exact format:
[
  {
    "description": "detailed visual description for DALL-E",
    "context": "brief explanation of why this visual is needed",
    "index": 0
  }
]`,
          },
          {
            role: "user",
            content: `Analyze this script and extract visual requirements:\n\n${script}${episodeContext}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn("[imageGen] No content in GPT response");
        return this.generateDefaultPrompts(script);
      }

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn("[imageGen] No JSON array found in response");
          return this.generateDefaultPrompts(script);
        }

        const prompts = JSON.parse(jsonMatch[0]) as ImagePrompt[];
        return prompts.slice(0, 8);
      } catch (parseError) {
        console.warn(
          "[imageGen] Failed to parse image prompts JSON:",
          parseError,
        );
        return this.generateDefaultPrompts(script);
      }
    } catch (error) {
      console.error("[imageGen] Error extracting image prompts:", error);
      return this.generateDefaultPrompts(script);
    }
  }

  /**
   * Generate fallback prompts if AI extraction fails
   */
  private generateDefaultPrompts(script: string): ImagePrompt[] {
    const words = script.split(/\s+/).length;
    const numImages = Math.min(Math.ceil(words / 100), 6);

    const themes = [
      "professional business environment",
      "modern technology workspace",
      "creative collaboration",
      "product showcase",
      "success and growth",
      "team working together",
    ];

    return Array.from({ length: numImages }, (_, i) => ({
      description: `${themes[i % themes.length]}, professional lighting, high quality, cinematic`,
      context: `Visual segment ${i + 1} for the video narrative`,
      index: i,
    }));
  }

  /**
   * Generate images using DALL-E 3 based on prompts
   */
  async generateImages(prompts: ImagePrompt[]): Promise<string[]> {
    this.initializeOpenAI();

    if (!prompts || prompts.length === 0) {
      return [];
    }

    const imageUrls: string[] = [];

    for (const prompt of prompts) {
      try {
        console.log(
          `[imageGen] Generating image for: ${prompt.description.slice(0, 50)}...`,
        );

        const response = await this.openai!.images.generate({
          model: "dall-e-3",
          prompt: prompt.description,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural",
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
  ): Promise<{
    prompts: ImagePrompt[];
    imageUrls: string[];
    creditCost: number;
  }> {
    console.log("[imageGen] Starting image generation pipeline");

    const prompts = await this.extractImagePromptsFromScript(script, episodes);
    console.log(`[imageGen] Extracted ${prompts.length} image prompts`);

    const imageUrls = await this.generateImages(prompts);
    console.log(`[imageGen] Generated ${imageUrls.length} images`);

    const creditCost = this.calculateImageGenerationCost(imageUrls.length);

    return {
      prompts,
      imageUrls,
      creditCost,
    };
  }
}
