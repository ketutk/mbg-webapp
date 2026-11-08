import { startInput } from "@/lib/schemas";
import { startQueuedGame } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: startInput },
  async ({ params, body }) => {
    const { id } = await params;
    const game = await startQueuedGame(id, body);
    return ok({ game });
  },
);

