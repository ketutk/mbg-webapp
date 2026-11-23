import { playerPaidInput, playerTierInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  setSessionPlayerPaid,
  setSessionPlayerTier,
} from "@/lib/server/sessions";

export const PUT = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: playerPaidInput },
  async ({ params, body }) => {
    const { id, playerId } = await params;
    const player = await setSessionPlayerPaid(id, playerId, body);
    return ok({ player });
  },
);

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: playerTierInput },
  async ({ params, body, user }) => {
    const { id, playerId } = await params;
    const player = await setSessionPlayerTier(id, playerId, body, user.id);
    return ok({ player });
  },
);
