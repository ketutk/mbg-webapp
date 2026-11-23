import { ok, route } from "@/lib/server/http";
import { undoTournamentMatch } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id, matchId } = await params;
    const tournament = await undoTournamentMatch(id, matchId);
    return ok({ tournament });
  },
);
