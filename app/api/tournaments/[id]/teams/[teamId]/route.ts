import { ok, route } from "@/lib/server/http";
import { removeTournamentTeam } from "@/lib/server/tournaments";

export const DELETE = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id, teamId } = await params;
    const tournament = await removeTournamentTeam(id, teamId);
    return ok({ tournament });
  },
);
