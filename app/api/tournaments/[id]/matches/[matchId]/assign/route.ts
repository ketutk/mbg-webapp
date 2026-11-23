import { tournamentMatchAssignInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { assignTournamentMatch } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentMatchAssignInput },
  async ({ params, body }) => {
    const { id, matchId } = await params;
    const tournament = await assignTournamentMatch(id, matchId, body);
    return ok({ tournament });
  },
);
