import { tournamentTeamPatchInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  removeTournamentTeam,
  updateTournamentTeam,
} from "@/lib/server/tournaments";

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentTeamPatchInput },
  async ({ params, body }) => {
    const { id, teamId } = await params;
    const tournament = await updateTournamentTeam(id, teamId, body);
    return ok({ tournament });
  },
);

export const DELETE = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id, teamId } = await params;
    const tournament = await removeTournamentTeam(id, teamId);
    return ok({ tournament });
  },
);
