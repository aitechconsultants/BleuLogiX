import { RequestHandler } from "express";
import { getPool, isDbReady } from "../db";

export const handleHealth: RequestHandler = async (_req, res) => {
  const services = { dbOk: false };

  try {
    if (isDbReady()) {
      const pool = getPool();
      const result = await pool.query("SELECT 1 as ok");
      services.dbOk = result.rows?.[0]?.ok === 1;
    }
  } catch {
    services.dbOk = false;
  }

  res.status(services.dbOk ? 200 : 503).json({
    ok: services.dbOk,
  });
};
