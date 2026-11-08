import { lockInput } from "@/lib/schemas";
import { setGameLock } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const PUT = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: lockInput },
  async ({ params, body }) => {
    const { id } = await params;
    const game = await setGameLock(id, body);
    return ok({ game });
  },
);

