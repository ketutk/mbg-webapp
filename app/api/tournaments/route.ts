import { tournamentCreateInput } from "@/lib/schemas";
import { created, ok, route } from "@/lib/server/http";
import { createTournament, listTournaments } from "@/lib/server/tournaments";
import type { TournamentStatus } from "@/lib/types";

export const GET = route({ roles: "public" }, async ({ req, user }) => {
  const { searchParams: sp } = new URL(req.url);
  const sessionId = sp.get("sessionId") || undefined;
  const rawStatus = sp.get("status");
  const status =
    rawStatus === "DRAFT" ||
    rawStatus === "IN_PROGRESS" ||
    rawStatus === "COMPLETED"
      ? (rawStatus as TournamentStatus)
      : undefined;

  const tournaments = await listTournaments({ sessionId, status }, user);
  return ok({ tournaments });
});

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentCreateInput },
  async ({ body, user }) => {
    const tournament = await createTournament(body, user.id);
    return created({ tournament });
  },
);
