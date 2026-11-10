import { ok, route } from "@/lib/server/http";
import { getSessionSummary } from "@/lib/server/sessions";

export const GET = route({ roles: "public" }, async ({ params, user }) => {
  const { id } = await params;
  const summary = await getSessionSummary(id, user);
  return ok({ summary });
});


