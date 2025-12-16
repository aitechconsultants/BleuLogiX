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

export async function getAffiliateProfile(): Promise<AffiliateProfile> {
  const response = await fetch("/api/affiliate/profile");

  if (!response.ok) {
    throw new Error("Failed to fetch affiliate profile");
  }

  const data = await response.json();
  return data.profile;
}

export async function createAffiliateProfile(): Promise<AffiliateProfile> {
  const response = await fetch("/api/affiliate/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create affiliate profile");
  }

  const data = await response.json();
  return data.profile;
}
