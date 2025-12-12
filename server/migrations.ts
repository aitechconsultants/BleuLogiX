import { getPool } from "./db";

export async function runMigrations() {
  const pool = getPool();

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        plan TEXT CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
        status TEXT CHECK (status IN ('active', 'trialing', 'canceled', 'past_due')) DEFAULT 'active',
        current_period_end TIMESTAMPTZ,
        last_credit_grant_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create credit_ledger table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        delta INT NOT NULL,
        reason TEXT NOT NULL,
        related_generation_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create generations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        template_id TEXT NOT NULL,
        input_json JSONB,
        voice_id TEXT,
        caption_style TEXT,
        status TEXT CHECK (status IN ('queued', 'rendering', 'complete', 'failed')) DEFAULT 'queued',
        preview_url TEXT,
        output_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create stripe_events table for idempotency
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stripe_event_id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        received_at TIMESTAMPTZ DEFAULT NOW(),
        payload JSONB NOT NULL
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created
      ON credit_ledger (user_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_generations_user_created
      ON generations (user_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
      ON subscriptions (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_events_id
      ON stripe_events (stripe_event_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_clerk_id
      ON users (clerk_user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users (email);
    `);

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
