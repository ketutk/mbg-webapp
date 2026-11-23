import { tournamentWalkoverInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { walkoverTournamentMatch } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentWalkoverInput },
  async ({ params, body }) => {
    const { id, matchId } = await params;
    const tournament = await walkoverTournamentMatch(
      id,
      matchId,
      body.winnerSide,
    );
    return ok({ tournament });
  },
);
