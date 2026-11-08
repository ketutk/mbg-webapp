import { gameUpdateInput } from "@/lib/schemas";
import { deleteGameRecord, updateGamePlayers } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: gameUpdateInput },
  async ({ params, body }) => {
    const { id } = await params;
    const game = await updateGamePlayers(id, body);
    return ok({ game });
  },
);

export const DELETE = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    await deleteGameRecord(id);
    return ok({ ok: true });
  },
);

