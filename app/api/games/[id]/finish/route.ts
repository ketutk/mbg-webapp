import { finishOnCourtGame } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    const game = await finishOnCourtGame(id);
    return ok({ game });
  },
);

