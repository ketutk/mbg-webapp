import { sessionInput } from "@/lib/schemas";
import { created, ok, route } from "@/lib/server/http";
import { createSessionRecord, listSessions } from "@/lib/server/sessions";
import type { SessionStatus } from "@/lib/types";

export const GET = route({ roles: "public" }, async ({ req, user }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const rawStatus = searchParams.get("status");
  const status: "ALL" | SessionStatus | undefined =
    rawStatus === "OPEN" || rawStatus === "CLOSED" || rawStatus === "ALL"
      ? rawStatus
      : undefined;
  const q = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;

  const result = await listSessions(
    { from, to, status, q, page, pageSize },
    user,
  );
  return ok(result);
});

export const POST = route(
  { roles: ["SUPERADMIN"], body: sessionInput },
  async ({ body, user }) => {
    const session = await createSessionRecord(body, user.id);
    return created({ session });
  },
);


