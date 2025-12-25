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

  // Some Leonardo deployments accept a preset/style field; keep optional.
  presetStyle?: string;
}

type LeonardoCreateResponseAny = any;
type LeonardoStatusResponseAny = any;

type LeonardoGeneratedImage = { id?: string; url?: string };

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
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      this.openai = new OpenAI({ apiKey });
    }
  }

  private getLeonardoModelId(imageStyle: string): string {
    const styleToModel: Record<string, string> = {
      realistic: "6bef9f1b-740f-4731-915a-8424467e9f7a",
      cinematic: "b63dcbd9-8f21-46d5-8e36-14490393bef0",
      "fine art": "e0cf4d76-13d3-4bcc-869c-8758c8c54d75",
      fantasy: "f1929ea3-6033-4f59-aca5-d373518e2db0",
      drama: "b63dcbd9-8f21-46d5-8e36-14490393bef0",
      dark: "b63dcbd9-8f21-46d5-8e36-14490393bef0",
    };
    return styleToModel[imageStyle.toLowerCase()] || styleToModel.realistic;
  }

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

  private extractVoiceoverScriptsForEpisodes(episodes: any[]): Map<number, string> {
    const voiceoverScripts = new Map<number, string>();

    const episodeDescriptions = episodes
      .map((ep) => ep.description)
      .filter((desc) => desc && typeof desc === "string")
      .join(" ");

    if (episodeDescriptions.trim()) {
      const cleanedScript = cleanScriptForVoiceover(episodeDescriptions);
      voiceoverScripts.set(-1, cleanedScript);
    }

    return voiceoverScripts;
  }

  async extractImagePromptsFromScript(
    script: string,
    episodes: any[] = [],
    imageStyle: string = "realistic",
  ): Promise<ImagePrompt[]> {
    this.initializeOpenAI();

    if ((!script || script.trim().length === 0) && episodes.length === 0) {
      return [];
    }

    const episodeVoiceoverScripts = this.extractVoiceoverScriptsForEpisodes(episodes);
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
            .join("\n")}\n\nUse these episodes to inform the visual style and context of the generated images.`
        : "";

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

    const styleGuide = styleGuideMap[imageStyle.toLowerCase()] || styleGuideMap.realistic;

    try {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You analyze scripts and output Leonardo.AI-ready image prompts.

Return ONLY valid JSON: an array of objects with:
- description (250+ chars, detailed, ${imageStyle} style)
- context
- index
- voiceoverScript

CRITICAL STYLE: ${styleGuide}`,
          },
          {
            role: "user",
            content: script?.trim()
              ? `Script:\n${script}${episodeContext}`
              : `Episodes:\n${episodeContext}\nGenerate visuals in ${imageStyle} style.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return this.generateDefaultPrompts(script);

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this.generateDefaultPrompts(script);

      let prompts = JSON.parse(jsonMatch[0]) as ImagePrompt[];

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
          voiceoverScript: voiceoverSegments[idx] || prompt.voiceoverScript || "",
        }));
      }

      prompts = prompts.map((p, idx) => ({
        description: String(p.description || "").trim(),
        context: String(p.context || "").trim(),
        index: Number.isFinite(p.index) ? p.index : idx,
        voiceoverScript: String(p.voiceoverScript || "").trim(),
      })).filter((p) => p.description.length > 0);

      return prompts.slice(0, 8);
    } catch (err) {
      console.error("[imageGen] Error extracting prompts:", err);
      return this.generateDefaultPrompts(script);
    }
  }

  private distributeVoiceoverAcrossPrompts(voiceoverScript: string, numPrompts: number): string[] {
    if (!voiceoverScript || numPrompts === 0) return [];
    if (numPrompts === 1) return [voiceoverScript];

    const sentences = voiceoverScript.match(/[^.!?]+[.!?]+/g) || [voiceoverScript];
    const segments: string[] = Array(numPrompts).fill("");
    let sentenceIdx = 0;

    for (let i = 0; i < numPrompts && sentenceIdx < sentences.length; i++) {
      const sentencesPerPrompt = Math.ceil(
        (sentences.length - sentenceIdx) / (numPrompts - i),
      );
      segments[i] = sentences.slice(sentenceIdx, sentenceIdx + sentencesPerPrompt).join("").trim();
      sentenceIdx += sentencesPerPrompt;
    }

    return segments;
  }

  private generateDefaultPrompts(script: string): ImagePrompt[] {
    const words = script?.trim() ? script.split(/\s+/).length : 0;
    const numImages = words > 0 ? Math.min(Math.ceil(words / 100), 6) : 6;

    const themes = [
      "professional business environment, shot on Sony A7R, sharp focus, natural daylight, 4K resolution, crisp details, bokeh background",
      "modern technology workspace, professional photograph, studio lighting setup, high-end production quality, vibrant colors, modern aesthetic",
      "creative collaboration, natural daylight, journalistic photography, authentic candid moment, documentary style, warm lighting",
      "product showcase, professional product photography, studio lighting, RAW quality, sharp focus, textured details, premium presentation",
      "success and growth, cinematic 4K, golden hour lighting, dynamic depth of field, dramatic shadows, cinema color grading",
      "team working together, professional environment, natural interaction, high-resolution, authentic setting, collaborative atmosphere",
    ];

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

  async generateImages(
    prompts: ImagePrompt[],
    imageStyle: string = "realistic",
    correlationId?: string,
  ): Promise<{ imageUrls: string[]; generationId: string | null }> {
    return this.generateImagesWithLeonardo(prompts, imageStyle, correlationId);
  }

  private async leonardoFetch(
    url: string,
    init: RequestInit,
    cid: string,
    timeoutMs: number,
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : (e?.message || String(e));
      throw new Error(`[imageGen] [${cid}] Leonardo fetch failed: ${msg}`);
    } finally {
      clearTimeout(t);
    }
  }

  private extractGenerationId(createData: LeonardoCreateResponseAny): string | null {
    return (
      createData?.sdGenerationJob?.generationId ||
      createData?.sdGenerationJob?.generation_id ||
      createData?.generationId ||
      createData?.generation_id ||
      createData?.id ||
      null
    );
  }

  private extractStatusAndImages(statusData: LeonardoStatusResponseAny): {
    status: string | null;
    images: LeonardoGeneratedImage[];
  } {
    const gen =
      statusData?.generations_by_pk ||
      statusData?.generation ||
      statusData;

    const status = gen?.status ? String(gen.status) : null;

    const imagesRaw =
      gen?.generated_images ||
      gen?.generatedImages ||
      statusData?.generated_images ||
      statusData?.generatedImages ||
      [];

    const images: LeonardoGeneratedImage[] = Array.isArray(imagesRaw) ? imagesRaw : [];
    return { status, images };
  }

  private async generateImagesWithLeonardo(
    prompts: ImagePrompt[],
    imageStyle: string = "realistic",
    correlationId?: string,
  ): Promise<{ imageUrls: string[]; generationId: string | null }> {
    const cid = correlationId || "unknown";

    if (!prompts || prompts.length === 0) {
      throw new Error("No image prompts provided for generation");
    }

    if (!this.leonardoApiKey) {
      throw new Error("Leonardo API key is not configured. Set LEONARDO_API_KEY.");
    }

    const modelId = this.getLeonardoModelId(imageStyle);
    const presetStyle = this.getLeonardoPresetStyle(imageStyle);

    const imageUrls: string[] = [];
    let firstGenerationId: string | null = null;

    // Collect per-prompt failures so we can throw one useful error at the end.
    const failures: Array<{ promptIndex: number; reason: string }> = [];

    for (let promptIdx = 0; promptIdx < prompts.length; promptIdx++) {
      const prompt = prompts[promptIdx];

      try {
        const generationRequest: LeonardoGenerationRequest = {
          prompt: prompt.description,
          num_images: 1,
          model_id: modelId,
          width: 1024,
          height: 1024,
          guidance_scale: 7,
          public: false,
          ...(presetStyle ? { presetStyle } : {}),
        };

        const create = await this.leonardoFetch(
          `${this.leonardoBaseUrl}/generations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.leonardoApiKey}`,
            },
            body: JSON.stringify(generationRequest),
          },
          cid,
          20000,
        );

        if (!create.ok) {
          failures.push({
            promptIndex: promptIdx,
            reason: `Create failed (${create.status}): ${create.text.slice(0, 500)}`,
          });
          continue;
        }

        let createData: any;
        try {
          createData = JSON.parse(create.text);
        } catch {
          failures.push({
            promptIndex: promptIdx,
            reason: `Create returned non-JSON: ${create.text.slice(0, 500)}`,
          });
          continue;
        }

        const generationId = this.extractGenerationId(createData);
        if (!generationId) {
          failures.push({
            promptIndex: promptIdx,
            reason: `No generationId in create response: ${JSON.stringify(createData).slice(0, 500)}`,
          });
          continue;
        }

        if (!firstGenerationId) firstGenerationId = generationId;

        // Poll
        const maxWaitMs = 60000; // 60s
        const pollEveryMs = 1200;
        const start = Date.now();
        let finalUrl: string | null = null;

        while (Date.now() - start < maxWaitMs) {
          const statusRes = await this.leonardoFetch(
            `${this.leonardoBaseUrl}/generations/${generationId}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${this.leonardoApiKey}` },
            },
            cid,
            15000,
          );

          if (!statusRes.ok) {
            failures.push({
              promptIndex: promptIdx,
              reason: `Status failed (${statusRes.status}): ${statusRes.text.slice(0, 500)}`,
            });
            break;
          }

          let statusData: any;
          try {
            statusData = JSON.parse(statusRes.text);
          } catch {
            failures.push({
              promptIndex: promptIdx,
              reason: `Status returned non-JSON: ${statusRes.text.slice(0, 500)}`,
            });
            break;
          }

          const { status, images } = this.extractStatusAndImages(statusData);

          if (status === "COMPLETE") {
            const url = images?.[0]?.url;
            if (url) finalUrl = url;
            break;
          }

          if (status === "FAILED" || status === "REJECTED") {
            failures.push({
              promptIndex: promptIdx,
              reason: `Generation ${status}`,
            });
            break;
          }

          await new Promise((r) => setTimeout(r, pollEveryMs));
        }

        if (finalUrl) {
          imageUrls.push(finalUrl);
        } else {
          failures.push({
            promptIndex: promptIdx,
            reason: `Timed out / no image URL returned`,
          });
        }
      } catch (e: any) {
        failures.push({
          promptIndex: promptIdx,
          reason: e?.message || String(e),
        });
      }
    }

    if (imageUrls.length === 0) {
      // Throw ONE clear error so your API can return 5xx and your UI won’t pretend success.
      const reasons = failures
        .slice(0, 5)
        .map((f) => `#${f.promptIndex + 1}: ${f.reason}`)
        .join(" | ");

      throw new Error(
        `Leonardo image generation failed (0/${prompts.length}). Top reasons: ${reasons}`,
      );
    }

    return { imageUrls, generationId: firstGenerationId };
  }

  calculateImageGenerationCost(imageCount: number): number {
    const costPerImage = 10;
    return imageCount * costPerImage;
  }

  async generateImagesFromScript(
    script: string,
    episodes: any[] = [],
    imageStyle: string = "realistic",
    correlationId?: string,
  ): Promise<{
    prompts: ImagePrompt[];
    imageUrls: string[];
    creditCost: number;
    generationId: string | null;
    timestamp: string;
  }> {
    const cid = correlationId || "unknown";
    console.log(`[imageGen] [${cid}] Starting image generation pipeline: ${imageStyle}`);

    const prompts = await this.extractImagePromptsFromScript(script, episodes, imageStyle);

    // IMPORTANT: Do NOT allow “success with 0 images”.
    const { imageUrls, generationId } = await this.generateImages(prompts, imageStyle, cid);

    const creditCost = this.calculateImageGenerationCost(imageUrls.length);

    return {
      prompts,
      imageUrls,
      creditCost,
      generationId,
      timestamp: new Date().toISOString(),
    };
  }
}
