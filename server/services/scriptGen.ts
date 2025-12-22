// server/services/scriptGen.ts

import OpenAI from "openai";
import Ajv, { type ValidateFunction } from "ajv";
import { query } from "../db";
import { logError } from "../logging";

const ajv = new Ajv({ allErrors: true, strict: false });

// Cache compiled schemas by template/version
const schemaCache = new Map<string, ValidateFunction>();

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * What your route expects to import.
 * Keep this aligned with server/routes/scriptGen.ts zod schema.
 */
export type GenerateScriptInput = {
  platform: "TikTok" | "YouTubeShorts" | "Reels";
  video_length_sec: number;
  style:
    | "UGC"
    | "Cinematic"
    | "Comedy"
    | "ASMR"
    | "Comparison"
    | "POVStory"
    | "Tutorial"
    | "DirectResponse";
  product_name: string;
  product_category?: string;
  key_benefits: string[];
  differentiators: string[];
  constraints?: {
    must_include?: string[];
    must_avoid?: string[];
    compliance_notes?: string;
  };
  audience: {
    target: string;
    pain_points: string[];
  };
  brand_voice: string;
  call_to_action: string;
  language?: string;
};

export type ScriptGenTemplate = {
  id: string;
  version: string;
  system_prompt: string;
  json_schema: unknown;
};

export type ScriptGenJobStatus = "running" | "succeeded" | "failed";

export type ScriptGenJob = {
  id: string;
  user_id: string;
  status: ScriptGenJobStatus;
  input_json: unknown;
  output_json?: unknown;
  model: string;
  prompt_version: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd_estimate?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
};

class ScriptGenService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private timeoutMs: number;
  private enableMock: boolean;
  private rateLimitPerMin: number;

  constructor() {
    // NOTE: If you want builds to succeed even when OPENAI_API_KEY is missing,
    // keep this check inside generateScript() instead of constructor().
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
    this.model = process.env.SCRIPT_GEN_MODEL || "gpt-4o-mini";
    this.maxTokens = parseInt(process.env.SCRIPT_GEN_MAX_TOKENS || "1200", 10);
    this.timeoutMs = parseInt(process.env.SCRIPT_GEN_TIMEOUT_MS || "45000", 10);
    this.enableMock =
      (process.env.SCRIPT_GEN_ENABLE_MOCK || "").toLowerCase() === "true";
    this.rateLimitPerMin = parseInt(
      process.env.SCRIPT_GEN_RATE_LIMIT_PER_MIN || "20",
      10,
    );
  }

  private validateOutput(output: unknown, schema: unknown, cacheKey: string) {
    let validate = schemaCache.get(cacheKey);
    if (!validate) {
      validate = ajv.compile(schema as any);
      schemaCache.set(cacheKey, validate);
    }
    const ok = validate(output);
    return { ok: !!ok, errors: validate.errors };
  }

  // ---- Stubs / hooks you likely already have elsewhere ----
  // If you already have these implemented, keep yours and delete these stubs.
  private async getTemplate(): Promise<ScriptGenTemplate> {
    // TODO: Replace with your DB lookup / template selection.
    return {
      id: "default",
      version: "v1",
      system_prompt:
        "You are a script generator. Output ONLY valid JSON matching the schema.",
      json_schema: {
        type: "object",
        additionalProperties: true,
      },
    };
  }

  private buildPrompt(template: ScriptGenTemplate, input: GenerateScriptInput) {
    // TODO: Replace with your prompt assembly logic
    return JSON.stringify({ template: template.id, input }, null, 2);
  }

  private generateMockScript(input: GenerateScriptInput) {
    return {
      platform: input.platform,
      hook: `Mock hook for ${input.product_name}`,
      script: ["Mock line 1", "Mock line 2"],
      cta: input.call_to_action,
    };
  }

  private async updateDailyUsage(_userId: string, _tokensIn: number, _tokensOut: number) {
    // TODO: Implement usage accounting if you have a table for it.
    return;
  }
  // ---------------------------------------------------------

  async generateScript(
    userId: string,
    input: GenerateScriptInput,
    correlationId: string,
  ): Promise<any> {
    const startTime = Date.now();
    let jobId: string | undefined;

    try {
      // (Rate limiting omitted here - keep your existing logic)
      void this.rateLimitPerMin;

      // IMPORTANT: store JSON in DB as JSON, not as raw JS object unless your db wrapper handles it
      const jobResult = await query<{ id: string }>(
        `INSERT INTO script_gen_jobs (user_id, status, input_json, model, prompt_version)
         VALUES ($1, 'running', $2, $3, $4)
         RETURNING id`,
        [userId, JSON.stringify(input), this.model, "v1"],
      );

      jobId = jobResult.rows[0]?.id;
      if (!jobId) throw new Error("Failed to create script_gen_jobs row (missing id)");

      const template = await this.getTemplate();

      if (this.enableMock) {
        const mockOutput = this.generateMockScript(input);
        await query(
          `UPDATE script_gen_jobs
           SET status='succeeded', output_json=$1, tokens_in=$2, tokens_out=$3, updated_at=NOW()
           WHERE id=$4`,
          [JSON.stringify(mockOutput), 50, 80, jobId],
        );
        await this.updateDailyUsage(userId, 50, 80);
        return mockOutput;
      }

      const userPrompt = this.buildPrompt(template, input);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Script generation timeout after ${this.timeoutMs}ms`)),
          this.timeoutMs,
        ),
      );

      const response: any = await Promise.race([
        this.openai.chat.completions.create({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            { role: "system", content: template.system_prompt },
            { role: "user", content: userPrompt },
          ],
        }),
        timeoutPromise,
      ]);

      const text = response?.choices?.[0]?.message?.content;

      if (!text || typeof text !== "string") {
        throw new Error("Unexpected response format from OpenAI");
      }

      const jsonText = extractFirstJsonObject(text);
      if (!jsonText) throw new Error("No JSON found in OpenAI response");
      const scriptOutput = JSON.parse(jsonText);

      const cacheKey = `${template.id}:${template.version}`;
      const v = this.validateOutput(scriptOutput, template.json_schema, cacheKey);
      if (!v.ok) {
        throw new Error(`Generated script does not match schema: ${ajv.errorsText(v.errors || [])}`);
      }

      const tokensIn = response?.usage?.prompt_tokens || 0;
      const tokensOut = response?.usage?.completion_tokens || 0;
      const costEstimate = (tokensIn / 1000) * 0.0005 + (tokensOut / 1000) * 0.0015;

      await query(
        `UPDATE script_gen_jobs
         SET status='succeeded', output_json=$1, tokens_in=$2, tokens_out=$3, cost_usd_estimate=$4, updated_at=NOW()
         WHERE id=$5`,
        [JSON.stringify(scriptOutput), tokensIn, tokensOut, costEstimate, jobId],
      );

      await this.updateDailyUsage(userId, tokensIn, tokensOut);

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
          // Don't mask original error if job update fails
          void e;
        }
      }

      const latency = Date.now() - startTime;
      logError(
        { correlationId, userId, jobId },
        `Script generation failed after ${latency}ms: ${errorMsg}`,
        error instanceof Error ? error : new Error(errorMsg),
      );

      throw error;
    }
  }
}

// ✅ Export the function your route imports
let _service: ScriptGenService | null = null;

export function getScriptGenService(): ScriptGenService {
  if (!_service) _service = new ScriptGenService();
  return _service;
}
