export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "linkedin";

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

export interface PlatformAdapter {
  platform: Platform;
  validateUsername(username: string): boolean;
  getProfileUrl(username: string): string;
  fetchMetrics(username: string): Promise<PlatformMetrics>;
  // Module 2B: OAuth methods (optional)
  getOAuthConfig?(): OAuthConfig;
  exchangeCodeForToken?(code: string): Promise<{ access_token: string; refresh_token?: string; expires_at?: Date }>;
  fetchOAuthMetrics?(accessToken: string): Promise<PlatformMetrics>;
}

// TikTok Adapter - Uses public API when available, gracefully falls back
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
    try {
      // Phase 1: Use public-facing methods or cached data
      // In production, integrate with TikTok public API when available
      // For now, return placeholder metrics with 0 values
      return {
        follower_count: 0,
        post_count: 0,
        profile_url: this.getProfileUrl(clean),
      };
    } catch (error) {
      console.error(`TikTok fetch error for @${clean}:`, error);
      throw new Error(`Failed to fetch TikTok data for @${clean}`);
    }
  },
};

// Instagram Adapter
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
    try {
      // Phase 1: Placeholder metrics
      return {
        follower_count: 0,
        post_count: 0,
        profile_url: this.getProfileUrl(clean),
      };
    } catch (error) {
      console.error(`Instagram fetch error for ${clean}:`, error);
      throw new Error(`Failed to fetch Instagram data for ${clean}`);
    }
  },
};

// YouTube Adapter
export const YouTubeAdapter: PlatformAdapter = {
  platform: "youtube",
  validateUsername(username: string): boolean {
    // Accept channel handles (@username) or legacy usernames
    return /^(@[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]{3,})$/.test(username);
  },
  getProfileUrl(username: string): string {
    if (username.startsWith("@")) {
      return `https://www.youtube.com/${username}`;
    }
    return `https://www.youtube.com/c/${username}`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    try {
      // Phase 1: Placeholder metrics
      return {
        follower_count: 0,
        post_count: 0,
        profile_url: this.getProfileUrl(username),
      };
    } catch (error) {
      console.error(`YouTube fetch error for ${username}:`, error);
      throw new Error(`Failed to fetch YouTube data for ${username}`);
    }
  },
};

// X (Twitter) Adapter
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
    try {
      // Phase 1: Placeholder metrics
      return {
        follower_count: 0,
        post_count: 0,
        profile_url: this.getProfileUrl(clean),
      };
    } catch (error) {
      console.error(`X fetch error for @${clean}:`, error);
      throw new Error(`Failed to fetch X data for @${clean}`);
    }
  },
};

// LinkedIn Adapter
export const LinkedInAdapter: PlatformAdapter = {
  platform: "linkedin",
  validateUsername(username: string): boolean {
    // LinkedIn profiles are typically in /in/username/ format
    return /^[a-zA-Z0-9-]{3,}$/.test(username);
  },
  getProfileUrl(username: string): string {
    return `https://www.linkedin.com/in/${username}/`;
  },
  async fetchMetrics(username: string): Promise<PlatformMetrics> {
    try {
      // Phase 1: Placeholder metrics
      return {
        follower_count: 0,
        post_count: 0,
        profile_url: this.getProfileUrl(username),
      };
    } catch (error) {
      console.error(`LinkedIn fetch error for ${username}:`, error);
      throw new Error(`Failed to fetch LinkedIn data for ${username}`);
    }
  },
};

// Platform registry for easy lookup
export const PlatformRegistry: Record<Platform, PlatformAdapter> = {
  tiktok: TikTokAdapter,
  instagram: InstagramAdapter,
  youtube: YouTubeAdapter,
  twitter: XAdapter,
  linkedin: LinkedInAdapter,
};

export function getPlatformAdapter(platform: Platform): PlatformAdapter {
  const adapter = PlatformRegistry[platform];
  if (!adapter) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return adapter;
}
