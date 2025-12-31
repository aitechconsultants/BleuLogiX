/**
 * Script Generation Service
 * Routes to Pipedream for generation (replacing direct OpenAI calls)
 */

import { generateScriptViaPipedream } from "./pipedream";

export interface GenerateScriptInput {
  videoTopic: string;
  niche?: string;
  styleTone?: string;
  maxChars?: number;
}

export interface ScriptGenService {
  generateScript(
    userId: string,
    input: GenerateScriptInput,
    correlationId: string,
  ): Promise<string>;
  checkHealth(): Promise<boolean>;
}

class PipedreamScriptGenService implements ScriptGenService {
  async generateScript(
    userId: string,
    input: GenerateScriptInput,
    correlationId: string,
  ): Promise<string> {
    console.log(`[ScriptGen] Generating via Pipedream for user ${userId}`, {
      correlationId,
      topic: input.videoTopic,
    });

    return generateScriptViaPipedream(input, correlationId);
  }

  async checkHealth(): Promise<boolean> {
    const endpoint = process.env.SCRIPT_GEN_URL;
    const token = process.env.SCRIPT_GEN_TOKEN;

    if (!endpoint || !token) {
      return false;
    }

    try {
      const response = await fetch(endpoint, {
        method: "OPTIONS",
        headers: {
          "x-script-gen-token": token,
          "x-origin-app": "bleulogix",
        },
      });
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }
}

let serviceInstance: ScriptGenService | null = null;

export function getScriptGenService(): ScriptGenService {
  if (!serviceInstance) {
    serviceInstance = new PipedreamScriptGenService();
  }
  return serviceInstance;
}
