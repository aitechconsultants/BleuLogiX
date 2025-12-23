export interface AffiliateProfile {
  id: string;
  user_id: string;
  affiliate_code: string;
  stats: {
    clicks: number;
    signups: number;
    upgrades: number;
    revenue: number;
  };
  created_at: string;
}

type ApiFetch = (path: string, options?: any) => Promise<any>;

export async function getAffiliateProfile(
  apiFetch: ApiFetch,
): Promise<AffiliateProfile> {
  const data = await apiFetch("/api/affiliate/profile");
  return data.profile;
}

export async function createAffiliateProfile(
  apiFetch: ApiFetch,
): Promise<AffiliateProfile> {
  const data = await apiFetch("/api/affiliate/create", {
    method: "POST",
  });
  return data.profile;
}
