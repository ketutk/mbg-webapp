import {
  tournamentTeamAddInput,
  tournamentTeamsReorderInput,
} from "@/lib/schemas";
import { created, ok, route } from "@/lib/server/http";
import {
  addTournamentTeam,
  reorderTournamentTeams,
} from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentTeamAddInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await addTournamentTeam(id, body);
    return created({ tournament });
  },
);

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentTeamsReorderInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await reorderTournamentTeams(id, body);
    return ok({ tournament });
  },
);
