export type RefreshMode = "manual" | "scheduled";

export interface RefreshSettings {
  refresh_mode: RefreshMode;
  refresh_interval_hours: number;
}

type ApiFetch = (path: string, options?: any) => Promise<any>;

export async function updateRefreshSettings(
  apiFetch: ApiFetch,
  accountId: string,
  settings: RefreshSettings,
): Promise<{ account: any }> {
  return apiFetch(`/api/social-accounts/${accountId}/refresh-settings`, {
    method: "PUT",
    body: settings,
  });
}
