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

    // Create script_gen_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS script_gen_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        json_schema JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create script_gen_jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS script_gen_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        workspace_id UUID,
        status TEXT CHECK (status IN ('queued', 'running', 'succeeded', 'failed')) DEFAULT 'queued',
        input_json JSONB NOT NULL,
        output_json JSONB,
        model TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        tokens_in INTEGER,
        tokens_out INTEGER,
        cost_usd_estimate NUMERIC,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create script_gen_usage_daily table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS script_gen_usage_daily (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        requests INTEGER DEFAULT 0,
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // Create indexes for script_gen tables
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_script_gen_jobs_user_id
      ON script_gen_jobs (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_script_gen_jobs_status
      ON script_gen_jobs (status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_script_gen_jobs_created
      ON script_gen_jobs (created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_script_gen_usage_user_date
      ON script_gen_usage_daily (user_id, date);
    `);

    // Seed default template if not exists
    await pool.query(`
      INSERT INTO script_gen_templates (name, version, system_prompt, user_prompt_template, json_schema, is_active)
      VALUES (
        'default_shortform_v1',
        'v1',
        'You are ScriptGen, an expert AI screenwriter specializing in short-form video content for TikTok, YouTube Shorts, and Instagram Reels. Your outputs are creative, engaging, and meticulously formatted. Always output ONLY valid JSON matching the provided schema. Do not include markdown, explanations, or any text outside the JSON structure. Every field must strictly adhere to the schema constraints.',
        'Generate a short-form video script with the following specifications:\n\n**Input Details:**\nPlatform: {platform}\nVideo Length: {video_length_sec} seconds\nStyle: {style}\nProduct: {product_name}\nKey Benefits: {key_benefits}\nTarget Audience: {audience_target}\nCall to Action: {call_to_action}\nBrand Voice: {brand_voice}\n\n**Instructions:**\n1. Create 3-5 compelling hooks that grab attention in the first frame.\n2. Design 4-12 scenes that flow naturally, each timed appropriately.\n3. Generate 6-18 captions for on-screen text and engagement.\n4. Provide safety checks for claims and copyright concerns.\n5. Include a clear primary and secondary call-to-action.\n\n**Output Requirements:**\n- Return ONLY valid JSON.\n- Strictly adhere to all array sizes and string lengths.\n- Use meaningful, actionable descriptions.',
        '{
          "type": "object",
          "additionalProperties": false,
          "required": ["meta", "hooks", "scenes", "captions", "cta", "safety"],
          "properties": {
            "meta": {
              "type": "object",
              "additionalProperties": false,
              "required": ["platform", "style", "video_length_sec", "language"],
              "properties": {
                "platform": { "type": "string" },
                "style": { "type": "string" },
                "video_length_sec": { "type": "number" },
                "language": { "type": "string" }
              }
            },
            "hooks": {
              "type": "array",
              "minItems": 3,
              "maxItems": 5,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": ["text", "intent"],
                "properties": {
                  "text": { "type": "string", "minLength": 5, "maxLength": 120 },
                  "intent": { "type": "string", "enum": ["curiosity", "shock", "benefit", "pain_point", "social_proof", "pattern_interrupt"] }
                }
              }
            },
            "scenes": {
              "type": "array",
              "minItems": 4,
              "maxItems": 12,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": ["scene_id", "duration_sec", "visual", "voiceover", "on_screen_text", "sfx_notes", "transition"],
                "properties": {
                  "scene_id": { "type": "number" },
                  "duration_sec": { "type": "number", "minimum": 1, "maximum": 12 },
                  "visual": { "type": "string", "maxLength": 280 },
                  "voiceover": { "type": "string", "maxLength": 280 },
                  "on_screen_text": { "type": "string", "maxLength": 120 },
                  "sfx_notes": { "type": "string", "maxLength": 120 },
                  "transition": { "type": "string", "maxLength": 80 }
                }
              }
            },
            "captions": {
              "type": "array",
              "minItems": 6,
              "maxItems": 18,
              "items": { "type": "string", "maxLength": 80 }
            },
            "cta": {
              "type": "object",
              "additionalProperties": false,
              "required": ["primary", "secondary"],
              "properties": {
                "primary": { "type": "string", "maxLength": 80 },
                "secondary": { "type": "string", "maxLength": 80 }
              }
            },
            "safety": {
              "type": "object",
              "additionalProperties": false,
              "required": ["claims_check", "copyright_check"],
              "properties": {
                "claims_check": { "type": "string", "enum": ["clean", "softened_claims", "needs_review"] },
                "copyright_check": { "type": "string", "enum": ["clean", "needs_review"] }
              }
            }
          }
        }',
        true
      )
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
