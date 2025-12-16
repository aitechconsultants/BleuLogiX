import OpenAI from "openai";
import Ajv from "ajv";
import { queryOne, query } from "../db";
import { logError } from "../logging";

interface GenerateScriptInput {
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
}

interface ScriptGenJob {
  id: string;
  user_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  input_json: GenerateScriptInput;
  output_json: any;
  model: string;
  prompt_version: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd_estimate: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ScriptGenTemplate {
  id: string;
  name: string;
  version: string;
  system_prompt: string;
  user_prompt_template: string;
  json_schema: any;
  is_active: boolean;
  created_at: string;
}

const ajv = new Ajv();

class ScriptGenService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private timeout: number;
  private enableMock: boolean;
  private rateLimitPerMin: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
    this.model = process.env.SCRIPT_GEN_MODEL || "gpt-4-mini";
    this.maxTokens = parseInt(process.env.SCRIPT_GEN_MAX_TOKENS || "1200", 10);
    this.timeout = parseInt(process.env.SCRIPT_GEN_TIMEOUT_MS || "45000", 10);
    this.enableMock =
      process.env.SCRIPT_GEN_ENABLE_MOCK?.toLowerCase() === "true";
    this.rateLimitPerMin = parseInt(
      process.env.SCRIPT_GEN_RATE_LIMIT_PER_MIN || "20",
      10,
    );
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM script_gen_jobs 
       WHERE user_id = $1 AND created_at > $2`,
      [userId, oneMinuteAgo.toISOString()],
    );

    const count = result?.count || 0;
    return count < this.rateLimitPerMin;
  }

  async getTemplate(
    templateName: string = "default_shortform_v1",
  ): Promise<ScriptGenTemplate> {
    let template = await queryOne<ScriptGenTemplate>(
      `SELECT * FROM script_gen_templates WHERE name = $1 AND is_active = true`,
      [templateName],
    );

    if (!template) {
      template = await queryOne<ScriptGenTemplate>(
        `SELECT * FROM script_gen_templates WHERE is_active = true LIMIT 1`,
      );
    }

    if (!template) {
      throw new Error(
        "No active script generation template found. Database may not be initialized.",
      );
    }

    return template;
  }

  buildPrompt(template: ScriptGenTemplate, input: GenerateScriptInput): string {
    let prompt = template.user_prompt_template;

    prompt = prompt.replace("{platform}", input.platform);
    prompt = prompt.replace(
      "{video_length_sec}",
      input.video_length_sec.toString(),
    );
    prompt = prompt.replace("{style}", input.style);
    prompt = prompt.replace("{product_name}", input.product_name);
    prompt = prompt.replace("{key_benefits}", input.key_benefits.join(", "));
    prompt = prompt.replace(
      "{differentiators}",
      input.differentiators.join(", "),
    );
    prompt = prompt.replace("{audience_target}", input.audience.target);
    prompt = prompt.replace(
      "{audience_pain_points}",
      input.audience.pain_points.join(", "),
    );
    prompt = prompt.replace("{brand_voice}", input.brand_voice);
    prompt = prompt.replace("{call_to_action}", input.call_to_action);

    return prompt;
  }

  validateOutput(output: any, schema: any): boolean {
    const validate = ajv.compile(schema);
    return validate(output);
  }

  generateMockScript(input: GenerateScriptInput): any {
    return {
      meta: {
        platform: input.platform,
        style: input.style,
        video_length_sec: input.video_length_sec,
        language: input.language || "en",
      },
      hooks: [
        {
          text: `Ever wonder why ${input.product_name} is changing everything?`,
          intent: "curiosity",
        },
        {
          text: `Most people don't realize this about ${input.product_category || "this product"}...`,
          intent: "pattern_interrupt",
        },
        {
          text: `Here's the truth: ${input.key_benefits[0] || "quality matters"}`,
          intent: "benefit",
        },
      ],
      scenes: [
        {
          scene_id: 1,
          duration_sec: 2,
          visual: `Intro shot showing ${input.product_name}`,
          voiceover: `Introducing ${input.product_name}`,
          on_screen_text: input.product_name,
          sfx_notes: "Subtle intro music",
          transition: "fade",
        },
        {
          scene_id: 2,
          duration_sec: 3,
          visual: "Product demo or benefit showcase",
          voiceover: `${input.brand_voice} - ${input.key_benefits[0] || "premium quality"}`,
          on_screen_text: input.key_benefits[0] || "Key benefit",
          sfx_notes: "Ambient background",
          transition: "cut",
        },
        {
          scene_id: 3,
          duration_sec: 2,
          visual: `Customer testimonial or ${input.differentiators[0] || "unique feature"}`,
          voiceover: "Why people choose us",
          on_screen_text: "Trusted by thousands",
          sfx_notes: "Uplifting music",
          transition: "fade",
        },
        {
          scene_id: 4,
          duration_sec: 2,
          visual: `${input.call_to_action} graphic`,
          voiceover: input.call_to_action,
          on_screen_text: input.call_to_action,
          sfx_notes: "Strong closing beat",
          transition: "fade to black",
        },
      ],
      captions: [
        input.product_name,
        input.key_benefits[0] || "Quality",
        input.differentiators[0] || "Innovation",
        input.brand_voice,
        "Limited time offer",
        input.call_to_action,
      ],
      cta: {
        primary: input.call_to_action,
        secondary: `Learn more about ${input.product_name}`,
      },
      safety: {
        claims_check: "clean",
        copyright_check: "clean",
      },
    };
  }

  async generateScript(
    userId: string,
    input: GenerateScriptInput,
    correlationId: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Check rate limit
      const allowed = await this.checkRateLimit(userId);
      if (!allowed) {
        throw new Error(
          `Rate limit exceeded: ${this.rateLimitPerMin} requests per minute`,
        );
      }

      // Create job record
      const jobResult = await query<{ id: string }>(
        `INSERT INTO script_gen_jobs (user_id, status, input_json, model, prompt_version)
         VALUES ($1, 'running', $2, $3, $4)
         RETURNING id`,
        [userId, input, this.model, "v1"],
      );

      const jobId = jobResult.rows[0]?.id;

      // Get template
      const template = await this.getTemplate();

      // Handle mock mode
      if (this.enableMock) {
        const mockOutput = this.generateMockScript(input);

        await query(
          `UPDATE script_gen_jobs
           SET status = 'succeeded', output_json = $1, tokens_in = $2, tokens_out = $3, updated_at = NOW()
           WHERE id = $4`,
          [mockOutput, 50, 80, jobId],
        );

        await this.updateDailyUsage(userId, 50, 80);

        return mockOutput;
      }

      // Build prompt
      const userPrompt = this.buildPrompt(template, input);

      // Call OpenAI with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Script generation timeout after ${this.timeout}ms`),
            ),
          this.timeout,
        ),
      );

      let response: any;
      try {
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
      } catch (error) {
        // Retry once on timeout or rate limit
        if (
          (error instanceof Error && error.message.includes("timeout")) ||
          (error instanceof Error && error.message.includes("429"))
        ) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          response = await this.openai.beta.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            system: template.system_prompt,
            messages: [{ role: "user", content: userPrompt }],
            betas: ["interleaved-thinking-2025-05-14"],
          } as any);
        } else {
          throw error;
        }
      }

      // Extract JSON from response
      let scriptOutput: any;
      const content = response.content[0];

      if (content.type === "text") {
        const text = content.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scriptOutput = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in OpenAI response");
        }
      } else {
        throw new Error("Unexpected response format from OpenAI");
      }

      // Validate against schema
      if (!this.validateOutput(scriptOutput, template.json_schema)) {
        throw new Error(
          `Generated script does not match required schema: ${ajv.errorsText()}`,
        );
      }

      // Calculate tokens and cost
      const tokensIn = response.usage?.input_tokens || 0;
      const tokensOut = response.usage?.output_tokens || 0;
      const costEstimate =
        (tokensIn / 1000) * 0.0005 + (tokensOut / 1000) * 0.0015;

      // Update job
      await query(
        `UPDATE script_gen_jobs
         SET status = 'succeeded', output_json = $1, tokens_in = $2, tokens_out = $3, 
             cost_usd_estimate = $4, updated_at = NOW()
         WHERE id = $5`,
        [scriptOutput, tokensIn, tokensOut, costEstimate, jobId],
      );

      // Update daily usage
      await this.updateDailyUsage(userId, tokensIn, tokensOut);

      const latency = Date.now() - startTime;
      console.log(
        `[ScriptGen] Job ${jobId} succeeded in ${latency}ms (tokens: ${tokensIn}/${tokensOut}, cost: $${costEstimate.toFixed(4)})`,
      );

      return scriptOutput;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      logError(
        { correlationId },
        `Script generation failed after ${latency}ms: ${errorMsg}`,
        error instanceof Error ? error : new Error(errorMsg),
      );

      throw error;
    }
  }

  private async updateDailyUsage(
    userId: string,
    tokensIn: number,
    tokensOut: number,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    await query(
      `INSERT INTO script_gen_usage_daily (user_id, date, requests, tokens_in, tokens_out)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (user_id, date) DO UPDATE SET
         requests = requests + 1,
         tokens_in = tokens_in + $3,
         tokens_out = tokens_out + $4,
         updated_at = NOW()`,
      [userId, today, tokensIn, tokensOut],
    );
  }
}

// Singleton instance
let instance: ScriptGenService | null = null;

export function getScriptGenService(): ScriptGenService {
  if (!instance) {
    instance = new ScriptGenService();
  }
  return instance;
}

export type { GenerateScriptInput, ScriptGenJob, ScriptGenTemplate };
