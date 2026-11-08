import { ok, route } from "@/lib/server/http";
import { getTreasurySummary } from "@/lib/server/treasury";

export const GET = route({ roles: ["ADMIN", "SUPERADMIN"] }, async () => {
  const treasury = await getTreasurySummary();
  return ok(treasury);
});

