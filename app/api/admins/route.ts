import { adminCreateInput } from "@/lib/schemas";
import { createAdminUser, listAdmins } from "@/lib/server/admins";
import { created, ok, route } from "@/lib/server/http";

export const GET = route({ roles: ["SUPERADMIN"] }, async () => {
  const admins = await listAdmins();
  return ok({ admins });
});

export const POST = route(
  { roles: ["SUPERADMIN"], body: adminCreateInput },
  async ({ body, user }) => {
    const admin = await createAdminUser(body, user.id);
    return created({ admin });
  },
);

