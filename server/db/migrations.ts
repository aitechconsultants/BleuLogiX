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
        effective_plan TEXT DEFAULT 'free' CHECK (effective_plan IN ('free', 'pro', 'enterprise')),
        plan_override TEXT CHECK (plan_override IN ('free', 'pro', 'enterprise', NULL)),
        plan_override_expires_at TIMESTAMPTZ,
        plan_override_reason TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due', NULL)),
        current_period_end TIMESTAMPTZ,
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

    // Create social_accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        workspace_id UUID,
        platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'linkedin')),
        username TEXT NOT NULL,
        profile_url TEXT,
        is_verified BOOLEAN,
        follower_count INTEGER DEFAULT 0,
        following_count INTEGER,
        post_count INTEGER DEFAULT 0,
        engagement_rate FLOAT,
        last_synced_at TIMESTAMPTZ,
        data_source TEXT DEFAULT 'public' CHECK (data_source IN ('public', 'oauth')),
        oauth_connected BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'paused')),
        refresh_mode TEXT DEFAULT 'manual' CHECK (refresh_mode IN ('manual', 'scheduled')),
        refresh_interval_hours INTEGER DEFAULT 24,
        next_refresh_at TIMESTAMPTZ,
        last_refresh_attempt_at TIMESTAMPTZ,
        refresh_error TEXT,
        refresh_fail_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create social_metrics_snapshots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_metrics_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
        followers INTEGER,
        views INTEGER,
        likes INTEGER,
        comments INTEGER,
        engagement_rate FLOAT,
        captured_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for social_accounts
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id
      ON social_accounts (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform
      ON social_accounts (user_id, platform);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_accounts_status
      ON social_accounts (status);
    `);

    // Module 2A indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_accounts_next_refresh
      ON social_accounts (next_refresh_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_accounts_user_next_refresh
      ON social_accounts (user_id, next_refresh_at);
    `);

    // Create indexes for social_metrics_snapshots
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_metrics_account_id
      ON social_metrics_snapshots (social_account_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_metrics_captured_at
      ON social_metrics_snapshots (social_account_id, captured_at DESC);
    `);

    // Module 2B: OAuth connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_oauth_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        social_account_id UUID NOT NULL UNIQUE REFERENCES social_accounts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        scopes TEXT,
        token_status TEXT DEFAULT 'active' CHECK (token_status IN ('active', 'expired', 'revoked', 'error')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_oauth_account_id
      ON social_oauth_connections (social_account_id);
    `);

    // Module 2C: Plan policies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_policies (
        plan_key TEXT PRIMARY KEY,
        social_accounts_limit INTEGER NOT NULL,
        allow_scheduled_refresh BOOLEAN DEFAULT FALSE,
        allow_oauth BOOLEAN DEFAULT FALSE,
        default_refresh_interval_hours INTEGER DEFAULT 24,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed plan policies
    await pool.query(`
      INSERT INTO plan_policies (plan_key, social_accounts_limit, allow_scheduled_refresh, allow_oauth, default_refresh_interval_hours)
      VALUES
        ('free', 1, FALSE, FALSE, 24),
        ('pro', 5, TRUE, FALSE, 24),
        ('premium', 10, TRUE, TRUE, 24),
        ('enterprise', 999, TRUE, TRUE, 6)
      ON CONFLICT (plan_key) DO NOTHING;
    `);

    // Module 2C: Workspace policy overrides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_policy_overrides (
        workspace_id UUID PRIMARY KEY,
        social_accounts_limit INTEGER,
        allow_scheduled_refresh BOOLEAN,
        allow_oauth BOOLEAN,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_policy_overrides_workspace_id
      ON workspace_policy_overrides (workspace_id);
    `);

    // Module 2D: Affiliate profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        affiliate_code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_code
      ON affiliate_profiles (affiliate_code);
    `);

    // Module 2D: Affiliate events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        affiliate_code TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'upgrade')),
        value_usd NUMERIC,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_events_code_created
      ON affiliate_events (affiliate_code, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_events_type_created
      ON affiliate_events (event_type, created_at DESC);
    `);

    // Module 2D: User attribution table (fallback if Clerk metadata unavailable)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_attribution (
        user_id UUID PRIMARY KEY,
        referral_code TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_attribution_referral_code
      ON user_attribution (referral_code);
    `);

    // Video Generator Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        form_state JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_projects_user_id
      ON video_projects (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_projects_user_created
      ON video_projects (user_id, created_at DESC);
    `);

    // subscription_audit_log table for tracking plan changes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('checkout_completed', 'subscription_updated', 'subscription_deleted', 'invoice_paid', 'plan_override_set', 'plan_override_cleared')),
        previous_plan TEXT CHECK (previous_plan IN ('free', 'pro', 'enterprise')),
        new_plan TEXT CHECK (new_plan IN ('free', 'pro', 'enterprise')),
        previous_status TEXT CHECK (previous_status IN ('active', 'trialing', 'canceled', 'past_due', NULL)),
        new_status TEXT CHECK (new_status IN ('active', 'trialing', 'canceled', 'past_due', NULL)),
        stripe_event_id TEXT,
        stripe_subscription_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_audit_user_id
      ON subscription_audit_log (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_audit_created
      ON subscription_audit_log (created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_audit_stripe_event
      ON subscription_audit_log (stripe_event_id);
    `);

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
