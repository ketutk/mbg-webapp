import { tournamentPatchInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  deleteTournament,
  getTournamentDetail,
  updateTournament,
} from "@/lib/server/tournaments";

export const GET = route({ roles: "public" }, async ({ params, user }) => {
  const { id } = await params;
  const tournament = await getTournamentDetail(id, user);
  return ok({ tournament });
});

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentPatchInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await updateTournament(id, body);
    return ok({ tournament });
  },
);

export const DELETE = route(
  { roles: ["SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    await deleteTournament(id);
    return ok({ ok: true });
  },
);
