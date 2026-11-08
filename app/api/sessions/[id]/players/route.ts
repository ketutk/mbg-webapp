import { rosterInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import { replaceSessionRoster } from "@/lib/server/sessions";

export const PUT = route(
  { roles: ["SUPERADMIN"], body: rosterInput },
  async ({ params, body }) => {
    const { id } = await params;
    const session = await replaceSessionRoster(id, body);
    return ok({ session });
  },
);

