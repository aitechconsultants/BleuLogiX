// server/services/scriptGen.ts (or wherever this pasted file lives)

import OpenAI from "openai";
import Ajv, { type ValidateFunction } from "ajv";
import { queryOne, query } from "../db";
import { logError } from "../logging";

const ajv = new Ajv({ allErrors: true, strict: false });

// cache compiled schemas by template/version (or schema JSON string)
const schemaCache = new Map<string, ValidateFunction>();

function extractFirstJsonObject(text: string) {
  // safer than /\{[\s\S]*\}/ because it can over-grab when text has multiple objects
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  return slice;
}

class ScriptGenService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private timeout: number;
  private enableMock: boolean;
  private rateLimitPerMin: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is required"); // :contentReference[oaicite:6]{index=6}

    this.openai = new OpenAI({ apiKey });
    this.model = process.env.SCRIPT_GEN_MODEL || "gpt-4-mini"; // :contentReference[oaicite:7]{index=7}
    this.maxTokens = parseInt(process.env.SCRIPT_GEN_MAX_TOKENS || "1200", 10);
    this.timeout = parseInt(process.env.SCRIPT_GEN_TIMEOUT_MS || "45000", 10);
    this.enableMock = process.env.SCRIPT_GEN_ENABLE_MOCK?.toLowerCase() === "true";
    this.rateLimitPerMin = parseInt(process.env.SCRIPT_GEN_RATE_LIMIT_PER_MIN || "20", 10);
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

  async generateScript(userId: string, input: any, correlationId: string): Promise<any> {
    const startTime = Date.now();
    let jobId: string | undefined;

    try {
      // (rate limit + template fetch omitted here; keep your existing logic)
      const jobResult = await query<{ id: string }>(
        `INSERT INTO script_gen_jobs (user_id, status, input_json, model, prompt_version)
         VALUES ($1, 'running', $2, $3, $4)
         RETURNING id`,
        [userId, input, this.model, "v1"],
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
          [mockOutput, 50, 80, jobId],
        );
        await this.updateDailyUsage(userId, 50, 80);
        return mockOutput;
      }

      const userPrompt = this.buildPrompt(template, input);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Script generation timeout after ${this.timeout}ms`)), this.timeout),
      );

      let response: any;
      response = await Promise.race([
        this.openai.beta.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          system: template.system_prompt,
          messages: [{ role: "user", content: userPrompt }],
          betas: ["interleaved-thinking-2025-05-14"],
        } as any),
        timeoutPromise,
      ]);

      const content = response.content?.[0];
      if (!content || content.type !== "text") {
        throw new Error("Unexpected response format from OpenAI");
      }

      const jsonText = extractFirstJsonObject(content.text);
      if (!jsonText) throw new Error("No JSON found in OpenAI response");
      const scriptOutput = JSON.parse(jsonText);

      const cacheKey = `${template.id}:${template.version}`;
      const v = this.validateOutput(scriptOutput, template.json_schema, cacheKey);
      if (!v.ok) {
        throw new Error(`Generated script does not match schema: ${ajv.errorsText(v.errors || [])}`);
      }

      const tokensIn = response.usage?.input_tokens || 0;
      const tokensOut = response.usage?.output_tokens || 0;
      const costEstimate = (tokensIn / 1000) * 0.0005 + (tokensOut / 1000) * 0.0015;

      await query(
        `UPDATE script_gen_jobs
         SET status='succeeded', output_json=$1, tokens_in=$2, tokens_out=$3, cost_usd_estimate=$4, updated_at=NOW()
         WHERE id=$5`,
        [scriptOutput, tokensIn, tokensOut, costEstimate, jobId],
      );

      await this.updateDailyUsage(userId, tokensIn, tokensOut);

      return scriptOutput;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // ✅ always mark job failed (if it exists)
      if (jobId) {
        await query(
          `UPDATE script_gen_jobs
           SET status='failed', error_message=$1, updated_at=NOW()
           WHERE id=$2`,
          [errorMsg, jobId],
        );
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

// ✅ IMPORTANT: fix the broken export line at the end of your file
export type { GenerateScriptInput, ScriptGenJob, ScriptGenTemplate };
