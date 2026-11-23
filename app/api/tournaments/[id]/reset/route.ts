import { ok, route } from "@/lib/server/http";
import { resetTournament } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    const tournament = await resetTournament(id);
    return ok({ tournament });
  },
);
