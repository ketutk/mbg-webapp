import { sessionInput } from "@/lib/schemas";
import { created, ok, route } from "@/lib/server/http";
import { createSessionRecord, listSessions } from "@/lib/server/sessions";

export const GET = route({ roles: "public" }, async () => {
  const sessions = await listSessions();
  return ok({ sessions });
});

export const POST = route(
  { roles: ["SUPERADMIN"], body: sessionInput },
  async ({ body, user }) => {
    const session = await createSessionRecord(body, user.id);
    return created({ session });
  },
);

