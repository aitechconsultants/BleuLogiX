import { OpenAI } from "openai";
import { query } from "../db";
import { logError } from "../logging";

export type GenerateScriptInput = {
  videoTopic: string;
  niche?: string;
  styleTone?: string;
  maxChars?: number;
};

export type ScriptGenJobStatus = "running" | "succeeded" | "failed";

export type ScriptGenJob = {
  id: string;
  user_id: string;
  status: ScriptGenJobStatus;
  input_json: unknown;
  output_json?: unknown;
  error_message?: string;
  created_at: string;
  updated_at: string;
};

class ScriptGenService {
  private openaiApiKey: string;
  private openaiModel: string;
  private maxTokens: number;
  private timeoutMs: number;
  private enableMock: boolean;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";
    this.openaiModel = process.env.SCRIPT_GEN_MODEL || "gpt-4o";
    this.maxTokens = parseInt(process.env.SCRIPT_GEN_MAX_TOKENS || "1200", 10);
    this.timeoutMs = parseInt(process.env.SCRIPT_GEN_TIMEOUT_MS || "45000", 10);
    this.enableMock =
      (process.env.SCRIPT_GEN_ENABLE_MOCK || "").toLowerCase() === "true";
  }

  private validateConfig(): void {
    if (!this.openaiApiKey && !this.enableMock) {
      throw new Error("server_misconfigured");
    }
  }

  private generateMockScript(input: GenerateScriptInput) {
    return {
      success: true,
      script: `Mock script for "${input.videoTopic}". This is a test script for the ${input.niche || "general"} niche with a ${input.styleTone || "neutral"} tone. The script is designed to be engaging and fits within ${input.maxChars || 2000} characters.`,
      topic: input.videoTopic,
      niche: input.niche || "general",
      tone: input.styleTone || "neutral",
      word_count: 42,
      character_count: 285,
    };
  }

  private buildPrompt(input: GenerateScriptInput): string {
    const niche = input.niche ? `Niche: ${input.niche}\n` : "";
    const tone = input.styleTone ? `Tone: ${input.styleTone}\n` : "";
    const maxChars = input.maxChars || 2000;

    return `You are an expert video script writer specializing in short-form content (TikTok, Instagram Reels, YouTube Shorts).

Generate a compelling video script for the following topic:

Topic: ${input.videoTopic}
${niche}${tone}Maximum characters: ${maxChars}

Requirements:
- Write an engaging script that grabs attention in the first 3 seconds
- Keep it within ${maxChars} characters
- Use clear, conversational language
- Include a strong call-to-action at the end
- Format with line breaks for easy reading

Output ONLY the script text, no additional explanation or metadata.`;
  }

  async generateScript(
    userId: string,
    input: GenerateScriptInput,
    correlationId: string,
  ): Promise<any> {
    const startTime = Date.now();
    let jobId: string | undefined;

    try {
      this.validateConfig();

      const jobResult = await query<{ id: string }>(
        `INSERT INTO script_gen_jobs (user_id, status, input_json, model, prompt_version)
         VALUES ($1, 'running', $2, $3, $4)
         RETURNING id`,
        [userId, JSON.stringify(input), this.openaiModel, "v1"],
      );

      jobId = jobResult.rows[0]?.id;
      if (!jobId)
        throw new Error("Failed to create script_gen_jobs row (missing id)");

      if (this.enableMock) {
        const mockOutput = this.generateMockScript(input);
        await query(
          `UPDATE script_gen_jobs
           SET status='succeeded', output_json=$1, tokens_in=10, tokens_out=42, updated_at=NOW()
           WHERE id=$2`,
          [JSON.stringify(mockOutput), jobId],
        );
        return mockOutput;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Script generation timeout after ${this.timeoutMs}ms`),
            ),
          this.timeoutMs,
        ),
      );

      const client = new OpenAI({
        apiKey: this.openaiApiKey,
      });

      const prompt = this.buildPrompt(input);

      let chatCompletion: any;
      try {
        const apiRequest = client.chat.completions.create({
          model: this.openaiModel,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        });

        chatCompletion = await Promise.race([apiRequest, timeoutPromise]);
      } catch (openaiError) {
        const errorDetails =
          openaiError instanceof Error
            ? {
                message: openaiError.message,
                name: openaiError.name,
                cause: (openaiError as any).cause,
                status: (openaiError as any).status,
              }
            : openaiError;

        const errorMsg = JSON.stringify(errorDetails, null, 2);
        throw new Error(`OpenAI API error: ${errorMsg}`);
      }

      const scriptText = chatCompletion.choices?.[0]?.message?.content || "";
      if (!scriptText) {
        throw new Error("OpenAI returned empty response");
      }

      const tokensIn = chatCompletion.usage?.prompt_tokens || 0;
      const tokensOut = chatCompletion.usage?.completion_tokens || 0;

      const scriptOutput = {
        success: true,
        script: scriptText.trim(),
        topic: input.videoTopic,
        niche: input.niche || "general",
        tone: input.styleTone || "neutral",
        word_count: scriptText.trim().split(/\s+/).length,
        character_count: scriptText.length,
        model: this.openaiModel,
        tokens_used: tokensIn + tokensOut,
      };

      await query(
        `UPDATE script_gen_jobs
         SET status='succeeded', output_json=$1, tokens_in=$2, tokens_out=$3, updated_at=NOW()
         WHERE id=$4`,
        [JSON.stringify(scriptOutput), tokensIn, tokensOut, jobId],
      );

      return scriptOutput;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (jobId) {
        try {
          await query(
            `UPDATE script_gen_jobs
             SET status='failed', error_message=$1, updated_at=NOW()
             WHERE id=$2`,
            [errorMsg, jobId],
          );
        } catch (e) {
          void e;
        }
      }

      const latency = Date.now() - startTime;
      logError(
        { correlationId, userId, jobId },
        `Script generation failed after ${latency}ms`,
      );

      throw error;
    }
  }

  async checkOpenAIHealth(): Promise<boolean> {
    try {
      if (!this.openaiApiKey && !this.enableMock) {
        return false;
      }
      if (this.enableMock) {
        return true;
      }
      const client = new OpenAI({
        apiKey: this.openaiApiKey,
      });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

let _service: ScriptGenService | null = null;

export function getScriptGenService(): ScriptGenService {
  if (!_service) _service = new ScriptGenService();
  return _service;
}
