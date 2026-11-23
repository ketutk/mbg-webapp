import { tournamentRandomizeInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { randomizeTournamentTeams } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentRandomizeInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await randomizeTournamentTeams(id, body);
    return ok({ tournament });
  },
);
