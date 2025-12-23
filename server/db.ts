import { Pool, QueryResult } from "pg";

// Database connection pool for PostgreSQL (Neon)
let pool: Pool | null = null;

export function initializeDatabase() {
  if (pool) return;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });
}

export function getPool(): Pool {
  if (!pool) {
    initializeDatabase();
  }
  if (!pool) {
    throw new Error("Database pool not initialized");
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<QueryResult<T>> {
  const poolInstance = getPool();
  return poolInstance.query<T>(text, values);
}

export async function queryOne<T = any>(
  text: string,
  values?: any[]
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

export async function queryAll<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  const result = await query<T>(text, values);
  return result.rows;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
