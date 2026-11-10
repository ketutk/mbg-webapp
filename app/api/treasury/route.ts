import { ok, route } from "@/lib/server/http";
import { getTreasurySummary } from "@/lib/server/treasury";
import type { EntryType } from "@/lib/types";

export const GET = route({ roles: ["ADMIN", "SUPERADMIN"] }, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const rawType = searchParams.get("type");
  const type: "ALL" | EntryType | undefined =
    rawType === "INCOME" || rawType === "EXPENSE" || rawType === "ALL"
      ? rawType
      : undefined;
  const q = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;

  const treasury = await getTreasurySummary({
    from,
    to,
    type,
    q,
    page,
    pageSize,
  });
  return ok(treasury);
});


