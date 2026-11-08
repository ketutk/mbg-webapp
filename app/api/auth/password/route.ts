import { changePasswordInput } from "@/lib/schemas";
import { changeOwnPassword } from "@/lib/server/auth";
import { ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: changePasswordInput },
  async ({ body, user }) => {
    await changeOwnPassword(user.id, body.currentPassword, body.newPassword);
    return ok({ ok: true });
  },
);

