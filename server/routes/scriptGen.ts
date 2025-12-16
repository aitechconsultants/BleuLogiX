import { RequestHandler, Router } from "express";
import { z } from "zod";
import { getScriptGenService, type GenerateScriptInput } from "../services/scriptGen";
import { logError } from "../logging";
import { queryOne } from "../db";

const scriptGenRouter = Router();

// Validation schema for generate request
const GenerateScriptRequestSchema = z.object({
  platform: z.enum(["TikTok", "YouTubeShorts", "Reels"]),
  video_length_sec: z.number().min(15).max(60),
  style: z.enum([
    "UGC",
    "Cinematic",
    "Comedy",
    "ASMR",
    "Comparison",
    "POVStory",
    "Tutorial",
    "DirectResponse",
  ]),
  product_name: z.string().min(1).max(100),
  product_category: z.string().max(100).optional(),
  key_benefits: z.array(z.string()).min(1).max(5),
  differentiators: z.array(z.string()).min(1).max(5),
  constraints: z
    .object({
      must_include: z.array(z.string()).optional(),
      must_avoid: z.array(z.string()).optional(),
      compliance_notes: z.string().optional(),
    })
    .optional(),
  audience: z.object({
    target: z.string().min(1).max(200),
    pain_points: z.array(z.string()).min(1).max(5),
  }),
  brand_voice: z.string().min(1).max(200),
  call_to_action: z.string().min(1).max(100),
  language: z.string().default("en"),
});

type GenerateScriptRequest = z.infer<typeof GenerateScriptRequestSchema>;

// Health check
export const handleScriptGenHealth: RequestHandler = (req, res) => {
  res.json({ ok: true, service: "script-gen" });
};

// Generate script (synchronous)
export const handleGenerateScript: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    // Check authentication
    const auth = (req as any).auth;
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    // Validate request body
    let payload: GenerateScriptRequest;
    try {
      payload = GenerateScriptRequestSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request payload",
          details: validationError.errors,
          correlationId,
        });
      }
      throw validationError;
    }

    // Get script generation service
    const service = getScriptGenService();

    // Generate script
    const script = await service.generateScript(
      auth.clerkUserId,
      payload as GenerateScriptInput,
      correlationId
    );

    res.json({
      success: true,
      script,
      correlationId,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    logError(
      { correlationId },
      "Script generation request failed",
      error instanceof Error ? error : new Error(errorMsg)
    );

    // Return appropriate status code based on error type
    if (
      errorMsg.includes("Rate limit") ||
      errorMsg.includes("too many requests")
    ) {
      return res.status(429).json({
        error: errorMsg,
        correlationId,
      });
    }

    if (errorMsg.includes("Authentication") || errorMsg.includes("Unauthorized")) {
      return res.status(401).json({
        error: errorMsg,
        correlationId,
      });
    }

    if (errorMsg.includes("schema") || errorMsg.includes("validation")) {
      return res.status(502).json({
        error: "Script generation produced invalid output",
        details: errorMsg,
        correlationId,
      });
    }

    res.status(500).json({
      error: "Failed to generate script",
      details: errorMsg,
      correlationId,
    });
  }
};

// Create job (async compatible)
export const handleCreateJob: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const auth = (req as any).auth;
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    // Validate request body
    let payload: GenerateScriptRequest;
    try {
      payload = GenerateScriptRequestSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request payload",
          details: validationError.errors,
          correlationId,
        });
      }
      throw validationError;
    }

    // Get script generation service and generate
    const service = getScriptGenService();
    const script = await service.generateScript(
      auth.clerkUserId,
      payload as GenerateScriptInput,
      correlationId
    );

    // Get the job ID from the most recent job for this user
    const job = await queryOne<{ id: string }>(
      `SELECT id FROM script_gen_jobs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [auth.clerkUserId]
    );

    res.json({
      success: true,
      jobId: job?.id,
      script,
      correlationId,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    logError(
      { correlationId },
      "Job creation failed",
      error instanceof Error ? error : new Error(errorMsg)
    );

    res.status(500).json({
      error: "Failed to create job",
      details: errorMsg,
      correlationId,
    });
  }
};

// Get job status
export const handleGetJob: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";

  try {
    const auth = (req as any).auth;
    if (!auth || !auth.clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized - authentication required",
        correlationId,
      });
    }

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: "jobId is required",
        correlationId,
      });
    }

    // Retrieve job and verify ownership
    const job = await queryOne(
      `SELECT * FROM script_gen_jobs 
       WHERE id = $1 AND user_id = $2`,
      [jobId, auth.clerkUserId]
    );

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        correlationId,
      });
    }

    res.json({
      success: true,
      job,
      correlationId,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    logError(
      { correlationId },
      "Failed to retrieve job",
      error instanceof Error ? error : new Error(errorMsg)
    );

    res.status(500).json({
      error: "Failed to retrieve job",
      details: errorMsg,
      correlationId,
    });
  }
};

// Mount routes
scriptGenRouter.get("/health", handleScriptGenHealth);
scriptGenRouter.post("/generate", handleGenerateScript);
scriptGenRouter.post("/jobs", handleCreateJob);
scriptGenRouter.get("/jobs/:jobId", handleGetJob);

export { scriptGenRouter };
