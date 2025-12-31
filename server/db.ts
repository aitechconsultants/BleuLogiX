import { Pool, QueryResult } from "pg";

// Database connection pool for PostgreSQL (Neon)
let pool: Pool | null = null;
let databaseInitialized = false;

/**
 * Safely parse DATABASE_URL to extract host and database name.
 * Returns null if parsing fails or DATABASE_URL is not set.
 */
export function parseDatabaseUrl(): {
  host: string;
  dbName: string;
  sslMode: string;
} | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }

  try {
    const url = new URL(dbUrl);
    const host = url.hostname;
    const dbName = url.pathname.substring(1); // Remove leading '/'
    const sslMode = url.searchParams.get("sslmode") || "default";
    return { host, dbName, sslMode };
  } catch {
    return null;
  }
}

export function initializeDatabase() {
  if (pool) return;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  // Log startup info once (sanitized, no secrets)
  if (!databaseInitialized) {
    databaseInitialized = true;
    const dbInfo = parseDatabaseUrl();
    if (dbInfo) {
      console.log(
        `[DB] Initialized: host=${dbInfo.host}, database=${dbInfo.dbName}, ssl=${dbInfo.sslMode}`,
      );
    } else {
      console.warn("[DB] Could not parse DATABASE_URL");
    }
  }
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
  values?: any[],
): Promise<QueryResult<T>> {
  const poolInstance = getPool();
  return poolInstance.query<T>(text, values);
}

export async function queryOne<T = any>(
  text: string,
  values?: any[],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

export async function queryAll<T = any>(
  text: string,
  values?: any[],
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
export function isDbReady(): boolean {
  return !!process.env.DATABASE_URL;
}

