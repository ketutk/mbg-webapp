import { tournamentMatchSwapInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { swapRoundOneSlots } from "@/lib/server/tournaments";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: tournamentMatchSwapInput },
  async ({ params, body }) => {
    const { id } = await params;
    const tournament = await swapRoundOneSlots(id, body.from, body.to);
    return ok({ tournament });
  },
);
