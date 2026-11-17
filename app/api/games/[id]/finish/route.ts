import { finishMatchInput } from "@/lib/schemas";
import { finishOnCourtGame } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: finishMatchInput },
  async ({ params, body }) => {
    const { id } = await params;
    const game = await finishOnCourtGame(id, body);
    return ok({ game });
  },
);
