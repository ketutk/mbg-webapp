import { assignInput } from "@/lib/schemas";
import { assignGame, clearSessionGames } from "@/lib/server/games";
import { created, ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: assignInput },
  async ({ params, body }) => {
    const { id } = await params;
    const game = await assignGame(id, body);
    return created({ game });
  },
);

export const DELETE = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    await clearSessionGames(id);
    return ok({ ok: true });
  },
);

