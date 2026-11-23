import { ok, route } from "@/lib/server/http";
import { startTournament } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    const tournament = await startTournament(id);
    return ok({ tournament });
  },
);
