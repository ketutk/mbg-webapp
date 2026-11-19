import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type { ClubSettingsInput } from "../schemas";
import type { ClubSettings } from "../types";

export async function saveClubSettings(
  input: ClubSettingsInput,
): Promise<ClubSettings> {
  const { settings } = await api<{ settings: ClubSettings }>("/club-settings", {
    method: "PATCH",
    body: input,
  });
  queryClient.setQueryData<ClubSettings>(queryKeys.clubSettings, settings);
  return settings;
}
