import { playerPaidInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { setSessionPlayerPaid } from "@/lib/server/sessions";

export const PUT = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: playerPaidInput },
  async ({ params, body }) => {
    const { id, playerId } = await params;
    const player = await setSessionPlayerPaid(id, playerId, body);
    return ok({ player });
  },
);
