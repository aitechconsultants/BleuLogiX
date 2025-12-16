export type Platform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "twitter"
  | "linkedin";

export interface PlatformMetrics {
  follower_count: number;
  following_count?: number;
  post_count: number;
  engagement_rate?: number;
  is_verified?: boolean;
  profile_url: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
};

export interface PlatformAdapter {
  platform: Platform;
  validateUsername(username: string): boolean;
  getProfileUrl(username: string): string;

  // Phase 1 public metrics (no OAuth)
  fetchMetrics(username: string): Promise<PlatformMetrics>;

  // Module 2B: OAuth methods (optional)
  getOAuthConfig?: () => OAuthConfig;
  exchangeCodeForToken?: (code: string) => Promise<OAuthTokenResponse>;
  fetchOAuthMetrics?: (accessToken: string) => Promise<PlatformMetrics>;
}

// TikTok Adapter - public only for now
export const TikTokAdapter: PlatformAdapter = {
  platform: "tiktok",
  validateUsername(username: string): boolean {
    return /^@?[a-zA-Z0-9._-]{2,30}$/.test(username.replace(/^@/, ""));
  },
  getProfileUrl(username: string): string {
    const clean = username.replace(/^@/, "");
    return `https://www.tiktok.com/@${clean}`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    const clean = username.replace(/^@/, "");
    return {
      follower_count: 0,
      post_count: 0,
      profile_url: this.getProfileUrl(clean),
    };
  },

  // ✅ Either REMOVE this until you implement token exchange,
  // ✅ or add exchangeCodeForToken + fetchOAuthMetrics too.
  // For now, safest: remove TikTok OAuth config to avoid partial OAuth support.
  // getOAuthConfig: () => ({ ... })
};

// Instagram Adapter (public only)
export const InstagramAdapter: PlatformAdapter = {
  platform: "instagram",
  validateUsername(username: string): boolean {
    return /^@?[a-zA-Z0-9._-]{2,30}$/.test(username.replace(/^@/, ""));
  },
  getProfileUrl(username: string): string {
    const clean = username.replace(/^@/, "");
    return `https://www.instagram.com/${clean}/`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    const clean = username.replace(/^@/, "");
    return {
      follower_count: 0,
      post_count: 0,
      profile_url: this.getProfileUrl(clean),
    };
  },
};

// YouTube Adapter (OAuth supported, but stubbed)
export const YouTubeAdapter: PlatformAdapter = {
  platform: "youtube",
  validateUsername(username: string): boolean {
    return /^(@[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]{3,})$/.test(username);
  },
  getProfileUrl(username: string): string {
    if (username.startsWith("@")) return `https://www.youtube.com/${username}`;
    return `https://www.youtube.com/c/${username}`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    return {
      follower_count: 0,
      post_count: 0,
      profile_url: this.getProfileUrl(username),
    };
  },

  getOAuthConfig(): OAuthConfig {
    return {
      clientId: process.env.YOUTUBE_OAUTH_CLIENT_ID || "",
      clientSecret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET || "",
      redirectUri: `${process.env.APP_URL}/api/social-oauth/youtube/callback`,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    };
  },

  // ✅ IMPORTANT: no "?" in implementations
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    // TODO: Implement real token exchange.
    throw new Error("YouTube OAuth exchange not yet implemented");
  },

  async fetchOAuthMetrics(accessToken: string): Promise<PlatformMetrics> {
    // TODO: Implement real OAuth metrics fetch.
    throw new Error("YouTube OAuth metrics fetch not yet implemented");
  },
};

// X (Twitter) Adapter (public only)
export const XAdapter: PlatformAdapter = {
  platform: "twitter",
  validateUsername(username: string): boolean {
    return /^@?[a-zA-Z0-9_]{1,15}$/.test(username.replace(/^@/, ""));
  },
  getProfileUrl(username: string): string {
    const clean = username.replace(/^@/, "");
    return `https://x.com/${clean}`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    const clean = username.replace(/^@/, "");
    return {
      follower_count: 0,
      post_count: 0,
      profile_url: this.getProfileUrl(clean),
    };
  },
};

// LinkedIn Adapter (public only)
export const LinkedInAdapter: PlatformAdapter = {
  platform: "linkedin",
  validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9-]{3,}$/.test(username);
  },
  getProfileUrl(username: string): string {
    return `https://www.linkedin.com/in/${username}/`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    return {
      follower_count: 0,
      post_count: 0,
      profile_url: this.getProfileUrl(username),
    };
  },
};

export const PlatformRegistry: Record<Platform, PlatformAdapter> = {
  tiktok: TikTokAdapter,
  instagram: InstagramAdapter,
  youtube: YouTubeAdapter,
  twitter: XAdapter,
  linkedin: LinkedInAdapter,
};

export function getPlatformAdapter(platform: Platform): PlatformAdapter {
  const adapter = PlatformRegistry[platform];
  if (!adapter) throw new Error(`Unknown platform: ${platform}`);
  return adapter;
}

export function assertOAuthSupported(
  adapter: PlatformAdapter,
): asserts adapter is PlatformAdapter & {
  getOAuthConfig: () => OAuthConfig;
  exchangeCodeForToken: (code: string) => Promise<OAuthTokenResponse>;
} {
  if (!adapter.getOAuthConfig || !adapter.exchangeCodeForToken) {
    throw new Error(`OAuth not supported for platform: ${adapter.platform}`);
  }
}
