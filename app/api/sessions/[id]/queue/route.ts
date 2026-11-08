import { queueOrderInput } from "@/lib/schemas";
import { reorderSessionQueue } from "@/lib/server/games";
import { ok, route } from "@/lib/server/http";

export const PUT = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: queueOrderInput },
  async ({ params, body }) => {
    const { id } = await params;
    const session = await reorderSessionQueue(id, body);
    return ok({ session });
  },
);

