import { softDeleteAdminUser } from "@/lib/server/admins";
import { ok, route } from "@/lib/server/http";

export const DELETE = route(
  { roles: ["SUPERADMIN"] },
  async ({ params, user }) => {
    const { id } = await params;
    await softDeleteAdminUser(id, user.id);
    return ok({ ok: true });
  },
);

