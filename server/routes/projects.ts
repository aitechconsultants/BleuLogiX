import { RequestHandler } from "express";
import { queryAll, queryOne, query } from "../db";
import { logError } from "../logging";
import { upsertUser } from "../users";

interface VideoProject {
  id: string;
  user_id: string;
  name: string;
  form_state: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const handleListProjects: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const auth = (req as any).auth;
  const clerkUserId = auth?.clerkUserId;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  try {
    console.log(
      `[projects] GET /api/projects - userId: ${userId}, correlationId: ${correlationId}`,
    );

    const projects = await queryAll<VideoProject>(
      `SELECT id, user_id, name, form_state, created_at, updated_at
       FROM video_projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId],
    );

    console.log(
      `[projects] Found ${projects.length} projects for user ${userId}`,
    );

    res.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[projects] Error listing projects:`, error);
    logError(
      { correlationId },
      "Failed to list projects",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to list projects",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleGetProject: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).userId;
  const { projectId } = req.params;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  if (!projectId) {
    return res.status(400).json({
      error: "projectId is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[projects] GET /api/projects/${projectId} - userId: ${userId}, correlationId: ${correlationId}`,
    );

    const project = await queryOne<VideoProject>(
      `SELECT id, user_id, name, form_state, created_at, updated_at
       FROM video_projects
       WHERE id = $1 AND user_id = $2`,
      [projectId, userId],
    );

    if (!project) {
      console.warn(`[projects] Project not found: ${projectId}`);
      return res.status(404).json({
        error: "Project not found",
        correlationId,
      });
    }

    console.log(
      `[projects] Found project ${projectId} for user ${userId}`,
    );

    res.json(project);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[projects] Error getting project:`, error);
    logError(
      { correlationId },
      "Failed to get project",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to get project",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleCreateProject: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).userId;
  const { name, formState } = req.body;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Project name is required",
      correlationId,
    });
  }

  if (!formState || typeof formState !== "object") {
    return res.status(400).json({
      error: "Form state is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[projects] POST /api/projects - userId: ${userId}, name: ${name}, correlationId: ${correlationId}`,
    );

    const result = await queryOne<VideoProject>(
      `INSERT INTO video_projects (user_id, name, form_state, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, name, form_state, created_at, updated_at`,
      [userId, name.trim(), formState],
    );

    console.log(`[projects] Created project ${result?.id} for user ${userId}`);

    res.status(201).json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[projects] Error creating project:`, error);
    logError(
      { correlationId },
      "Failed to create project",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to create project",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleUpdateProject: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).userId;
  const { projectId } = req.params;
  const { name, formState } = req.body;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  if (!projectId) {
    return res.status(400).json({
      error: "projectId is required",
      correlationId,
    });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Project name is required",
      correlationId,
    });
  }

  if (!formState || typeof formState !== "object") {
    return res.status(400).json({
      error: "Form state is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[projects] PUT /api/projects/${projectId} - userId: ${userId}, name: ${name}, correlationId: ${correlationId}`,
    );

    const project = await queryOne<VideoProject>(
      `SELECT id FROM video_projects WHERE id = $1 AND user_id = $2`,
      [projectId, userId],
    );

    if (!project) {
      console.warn(`[projects] Project not found: ${projectId}`);
      return res.status(404).json({
        error: "Project not found",
        correlationId,
      });
    }

    const result = await queryOne<VideoProject>(
      `UPDATE video_projects
       SET name = $1, form_state = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, user_id, name, form_state, created_at, updated_at`,
      [name.trim(), formState, projectId, userId],
    );

    console.log(`[projects] Updated project ${projectId} for user ${userId}`);

    res.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[projects] Error updating project:`, error);
    logError(
      { correlationId },
      "Failed to update project",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to update project",
      message: errorMsg,
      correlationId,
    });
  }
};

export const handleDeleteProject: RequestHandler = async (req, res) => {
  const correlationId = (req as any).correlationId || "unknown";
  const userId = (req as any).userId;
  const { projectId } = req.params;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      correlationId,
    });
  }

  if (!projectId) {
    return res.status(400).json({
      error: "projectId is required",
      correlationId,
    });
  }

  try {
    console.log(
      `[projects] DELETE /api/projects/${projectId} - userId: ${userId}, correlationId: ${correlationId}`,
    );

    const project = await queryOne<VideoProject>(
      `SELECT id FROM video_projects WHERE id = $1 AND user_id = $2`,
      [projectId, userId],
    );

    if (!project) {
      console.warn(`[projects] Project not found: ${projectId}`);
      return res.status(404).json({
        error: "Project not found",
        correlationId,
      });
    }

    await query(
      `DELETE FROM video_projects WHERE id = $1 AND user_id = $2`,
      [projectId, userId],
    );

    console.log(`[projects] Deleted project ${projectId} for user ${userId}`);

    res.status(204).send();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[projects] Error deleting project:`, error);
    logError(
      { correlationId },
      "Failed to delete project",
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      error: "Failed to delete project",
      message: errorMsg,
      correlationId,
    });
  }
};
