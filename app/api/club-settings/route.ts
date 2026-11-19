import { clubSettingsInput } from "@/lib/schemas";
import { getClubSettings, updateClubSettings } from "@/lib/server/club-settings";
import { ok, route } from "@/lib/server/http";

export const GET = route({ roles: "public" }, async () => {
  const settings = await getClubSettings();
  return ok({ settings });
});

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: clubSettingsInput },
  async ({ body, user }) => {
    const settings = await updateClubSettings(body, user);
    return ok({ settings });
  },
);
