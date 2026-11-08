import { adminPasswordInput } from "@/lib/schemas";
import { resetAdminUserPassword } from "@/lib/server/admins";
import { ok, route } from "@/lib/server/http";

export const PUT = route(
  { roles: ["SUPERADMIN"], body: adminPasswordInput },
  async ({ params, body }) => {
    const { id } = await params;
    await resetAdminUserPassword(id, body);
    return ok({ ok: true });
  },
);

