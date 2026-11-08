import { logoutCurrentSession } from "@/lib/server/auth";
import { ok, route } from "@/lib/server/http";

export const POST = route({ roles: "public" }, async () => {
  await logoutCurrentSession();
  return ok({ ok: true });
});

