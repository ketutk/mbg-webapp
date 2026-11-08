import { loginSchema } from "@/lib/schemas";
import { loginWithPassword } from "@/lib/server/auth";
import { ok, route } from "@/lib/server/http";

export const POST = route(
  { roles: "public", body: loginSchema },
  async ({ body }) => {
    const user = await loginWithPassword(body.username, body.password);
    return ok({ user });
  },
);

