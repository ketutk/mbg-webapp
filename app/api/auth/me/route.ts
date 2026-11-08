import { ok, route } from "@/lib/server/http";

export const GET = route({ roles: "public" }, async ({ user }) => {
  return ok({ user });
});

