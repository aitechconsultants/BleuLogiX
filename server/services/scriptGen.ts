import { query } from "../db";
import { logError } from "../logging";

export type GenerateScriptInput = {
  videoTopic: string;
  niche: string;
  styleTone: string;
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
  private pipedrreamUrl: string;
  private pipedrreamToken: string;
  private timeoutMs: number;
  private enableMock: boolean;

  constructor() {
    this.pipedrreamUrl = process.env.SCRIPT_GEN_URL || "";
    this.pipedrreamToken = process.env.SCRIPT_GEN_TOKEN || "";
    this.timeoutMs = parseInt(process.env.SCRIPT_GEN_TIMEOUT_MS || "30000", 10);
    this.enableMock =
      (process.env.SCRIPT_GEN_ENABLE_MOCK || "").toLowerCase() === "true";
  }

  private validateConfig(): void {
    if (!this.pipedrreamUrl || !this.pipedrreamToken) {
      throw new Error("server_misconfigured");
    }
  }

  private generateMockScript(input: GenerateScriptInput) {
    return {
      success: true,
      script: `Mock script for ${input.videoTopic} in ${input.niche} style: ${input.styleTone}`,
      topic: input.videoTopic,
      niche: input.niche,
      tone: input.styleTone,
    };
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
        `INSERT INTO script_gen_jobs (user_id, status, input_json)
         VALUES ($1, 'running', $2)
         RETURNING id`,
        [userId, JSON.stringify(input)],
      );

      jobId = jobResult.rows[0]?.id;
      if (!jobId)
        throw new Error("Failed to create script_gen_jobs row (missing id)");

      if (this.enableMock) {
        const mockOutput = this.generateMockScript(input);
        await query(
          `UPDATE script_gen_jobs
           SET status='succeeded', output_json=$1, updated_at=NOW()
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

      const requestBody = {
        videoTopic: input.videoTopic,
        niche: input.niche,
        styleTone: input.styleTone,
        maxChars: input.maxChars || 2000,
      };

      const response: any = await Promise.race([
        fetch(this.pipedrreamUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-script-gen-token": this.pipedrreamToken,
          },
          body: JSON.stringify(requestBody),
        }),
        timeoutPromise,
      ]);

      if (!response.ok) {
        throw new Error(
          `Pipedream returned ${response.status}: ${response.statusText}`,
        );
      }

      const scriptOutput = await response.json();

      await query(
        `UPDATE script_gen_jobs
         SET status='succeeded', output_json=$1, updated_at=NOW()
         WHERE id=$2`,
        [JSON.stringify(scriptOutput), jobId],
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

  async checkPipedrreamHealth(): Promise<boolean> {
    try {
      this.validateConfig();
      const response = await fetch(this.pipedrreamUrl, {
        method: "HEAD",
        headers: {
          "x-script-gen-token": this.pipedrreamToken,
        },
      });
      return response.ok;
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
