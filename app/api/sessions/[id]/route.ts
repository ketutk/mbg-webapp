import { sessionPatchInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  deleteSessionRecord,
  getSessionDetail,
  updateSessionRecord,
} from "@/lib/server/sessions";

export const GET = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    const session = await getSessionDetail(id);
    return ok({ session });
  },
);

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: sessionPatchInput },
  async ({ params, body, user }) => {
    const { id } = await params;
    const session = await updateSessionRecord(id, body, user);
    return ok({ session });
  },
);

export const DELETE = route({ roles: ["SUPERADMIN"] }, async ({ params }) => {
  const { id } = await params;
  await deleteSessionRecord(id);
  return ok({ ok: true });
});

