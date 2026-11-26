import { tournamentMatchOrderInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { updateTournamentMatchOrder } from "@/lib/server/tournaments";

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentMatchOrderInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await updateTournamentMatchOrder(id, body.matchIds);
    return ok({ tournament });
  },
);
