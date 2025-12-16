export type RefreshMode = "manual" | "scheduled";

export interface RefreshSettings {
  refresh_mode: RefreshMode;
  refresh_interval_hours: number;
}

export async function updateRefreshSettings(
  accountId: string,
  settings: RefreshSettings,
): Promise<{ account: any }> {
  const response = await fetch(
    `/api/social-accounts/${accountId}/refresh-settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update refresh settings");
  }

  return response.json();
}
