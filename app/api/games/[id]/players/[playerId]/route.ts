import { tickInput } from "@/lib/schemas";
import { setPlayerTick } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const PUT = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tickInput },
  async ({ params, body }) => {
    const { id, playerId } = await params;
    const game = await setPlayerTick(id, playerId, body);
    return ok({ game });
  },
);

