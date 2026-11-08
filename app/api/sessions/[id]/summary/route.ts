import { ok, route } from "@/lib/server/http";
import { getSessionSummary } from "@/lib/server/sessions";

export const GET = route({ roles: "public" }, async ({ params }) => {
  const { id } = await params;
  const summary = await getSessionSummary(id);
  return ok({ summary });
});

