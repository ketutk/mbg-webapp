import "server-only";
import type { Prisma } from "@prisma/client";
import { addDaysISO, getWeekMondayISO } from "@/lib/date";
import { prisma } from "./db";
import { fromDateStr, toDateStr, toTreasuryEntryDTO } from "./dto";
import { HttpError } from "./http";
import { listTreasuryCategories } from "./treasury-categories";
import type { TreasuryInput, TreasuryPatchInput } from "@/lib/schemas";
import type {
  AuthUser,
  EntryType,
  TreasuryCategoryBreakdown,
  TreasuryEntry,
  TreasuryFilterParams,
  TreasuryMonthlyBucket,
  TreasurySummary,
  TreasuryWeeklyBucket,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function resolveUsernames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, username: true },
  });
  return new Map(users.map((u) => [u.id, u.username]));
}

async function resolveCategoryId(
  entryType: EntryType,
  categoryId?: string | null,
): Promise<string | null> {
  if (categoryId) {
    const cat = await prisma.treasuryCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) {
      throw new HttpError(
        400,
        "VALIDATION",
        "Selected category does not exist.",
        { categoryId: "Category not found" },
      );
    }
    if (cat.type !== null && cat.type !== entryType) {
      throw new HttpError(
        400,
        "VALIDATION",
        `Category “${cat.name}” only applies to ${cat.type === "INCOME" ? "income" : "spent"} entries.`,
        { categoryId: "Category does not match entry type" },
      );
    }
    return cat.id;
  }

  const others = await prisma.treasuryCategory.findUnique({
    where: { nameKey: "others" },
    select: { id: true },
  });
  return others?.id ?? null;
}

function buildRecentMonths(anchorYm: string, count = 12): string[] {
  const [yStr, mStr] = anchorYm.split("-");
  let year = Number(yStr) || new Date().getFullYear();
  let month = Number(mStr) || new Date().getMonth() + 1;

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

function buildRecentWeeks(
  anchorDateStr: string,
  count = 16,
): { weekStart: string; weekEnd: string }[] {
  const latestMonday = getWeekMondayISO(anchorDateStr);
  const out: { weekStart: string; weekEnd: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const weekStart = addDaysISO(latestMonday, -i * 7);
    const weekEnd = addDaysISO(weekStart, 6);
    out.push({ weekStart, weekEnd });
  }
  return out;
}

export async function getTreasurySummary(
  params: TreasuryFilterParams = {},
): Promise<TreasurySummary> {
  const pageSize = Math.min(100, Math.max(5, Math.trunc(params.pageSize || 10)));
  const requestedPage = Math.max(1, Math.trunc(params.page || 1));

  const fromStr = params.from && DATE_RE.test(params.from) ? params.from : undefined;
  const toStr = params.to && DATE_RE.test(params.to) ? params.to : undefined;
  const typeFilter =
    params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;
  const categoryFilter = params.categoryId?.trim()
    ? params.categoryId.trim()
    : undefined;
  const qFilter = params.q?.trim() ? params.q.trim() : undefined;

  const filteredWhere: Prisma.TreasuryEntryWhereInput = {
    deletedAt: null,
    ...(fromStr || toStr
      ? {
          date: {
            ...(fromStr ? { gte: fromDateStr(fromStr) } : {}),
            ...(toStr ? { lte: fromDateStr(toStr) } : {}),
          },
        }
      : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    ...(qFilter
      ? {
          purpose: {
            contains: qFilter,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [
    allTimeSums,
    periodSums,
    categorySums,
    totalEntries,
    latestActiveEntry,
    categories,
  ] = await Promise.all([
    prisma.treasuryEntry.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.treasuryEntry.groupBy({
      by: ["type"],
      where: filteredWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.treasuryEntry.groupBy({
      by: ["categoryId", "type"],
      where: filteredWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.treasuryEntry.count({ where: filteredWhere }),
    prisma.treasuryEntry.findFirst({
      where: { deletedAt: null },
      select: { date: true },
      orderBy: { date: "desc" },
    }),
    listTreasuryCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const latestDateStr = latestActiveEntry
    ? toDateStr(latestActiveEntry.date)
    : toDateStr(new Date());
  const latestYm = latestDateStr.slice(0, 7);
  const monthKeys = buildRecentMonths(latestYm, 12);
  const weekRanges = buildRecentWeeks(latestDateStr, 16);
  const firstMonthDateStr = `${monthKeys[0]}-01`;
  const firstWeekDateStr = weekRanges[0].weekStart;
  const chartStartDate = fromDateStr(
    firstMonthDateStr <= firstWeekDateStr ? firstMonthDateStr : firstWeekDateStr,
  );

  const [entries, recentChartSums] = await Promise.all([
    prisma.treasuryEntry.findMany({
      where: filteredWhere,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: { select: { name: true } } },
    }),
    prisma.treasuryEntry.groupBy({
      by: ["type", "date"],
      where: {
        deletedAt: null,
        date: { gte: chartStartDate },
      },
      _sum: { amount: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  for (const row of allTimeSums) {
    if (row.type === "INCOME") income = row._sum.amount ?? 0;
    if (row.type === "EXPENSE") expense = row._sum.amount ?? 0;
  }

  let periodIncome = 0;
  let periodExpense = 0;
  let periodIncomeCount = 0;
  let periodExpenseCount = 0;
  for (const row of periodSums) {
    if (row.type === "INCOME") {
      periodIncome = row._sum.amount ?? 0;
      periodIncomeCount = row._count._all;
    }
    if (row.type === "EXPENSE") {
      periodExpense = row._sum.amount ?? 0;
      periodExpenseCount = row._count._all;
    }
  }

  const catNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const categoryBreakdown: TreasuryCategoryBreakdown[] = categorySums
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName:
        (row.categoryId ? catNameMap.get(row.categoryId) : undefined) ?? "Others",
      type: row.type,
      total: row._sum.amount ?? 0,
      count: row._count._all,
    }))
    .sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName));

  const bucketMap = new Map<string, TreasuryMonthlyBucket>(
    monthKeys.map((m) => [m, { month: m, income: 0, expense: 0 }]),
  );
  const weekBucketMap = new Map<string, TreasuryWeeklyBucket>(
    weekRanges.map((w) => [w.weekStart, { ...w, income: 0, expense: 0 }]),
  );

  for (const row of recentChartSums) {
    const dateStr = toDateStr(row.date);
    const sum = row._sum.amount ?? 0;

    const bucket = bucketMap.get(dateStr.slice(0, 7));
    if (bucket) {
      if (row.type === "INCOME") bucket.income += sum;
      else bucket.expense += sum;
    }

    const weekBucket = weekBucketMap.get(getWeekMondayISO(dateStr));
    if (weekBucket) {
      if (row.type === "INCOME") weekBucket.income += sum;
      else weekBucket.expense += sum;
    }
  }

  const userMap = await resolveUsernames(entries.map((e) => e.createdById));

  return {
    balance: income - expense,
    income,
    expense,
    periodIncome,
    periodExpense,
    periodNet: periodIncome - periodExpense,
    periodIncomeCount,
    periodExpenseCount,
    categories,
    categoryBreakdown,
    monthly: Array.from(bucketMap.values()),
    weekly: Array.from(weekBucketMap.values()),
    entries: entries.map((e) => toTreasuryEntryDTO(e, userMap)),
    totalEntries,
    page,
    pageSize,
    totalPages,
  };
}

export async function createTreasuryEntry(
  input: TreasuryInput,
  user: AuthUser,
): Promise<TreasuryEntry> {
  const categoryId = await resolveCategoryId(input.type, input.categoryId);
  const created = await prisma.treasuryEntry.create({
    data: {
      type: input.type,
      amount: input.amount,
      purpose: input.purpose,
      date: fromDateStr(input.date),
      categoryId,
      createdById: user.id,
    },
    include: { category: { select: { name: true } } },
  });
  return toTreasuryEntryDTO(created, new Map([[user.id, user.username]]));
}

export async function updateTreasuryEntry(
  id: string,
  input: TreasuryPatchInput,
  user: AuthUser,
): Promise<TreasuryEntry> {
  const existing = await prisma.treasuryEntry.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!existing || existing.deletedAt !== null) {
    throw new HttpError(404, "NOT_FOUND", "Treasury entry not found.");
  }

  const nextType = input.type ?? existing.type;
  let nextCategoryId: string | null | undefined = undefined;
  if (input.categoryId !== undefined) {
    nextCategoryId = await resolveCategoryId(nextType, input.categoryId);
  } else if (
    input.type !== undefined &&
    existing.category?.type !== null &&
    existing.category?.type !== nextType
  ) {
    nextCategoryId = await resolveCategoryId(nextType, null);
  }

  const updated = await prisma.treasuryEntry.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.date !== undefined ? { date: fromDateStr(input.date) } : {}),
      ...(nextCategoryId !== undefined ? { categoryId: nextCategoryId } : {}),
      updatedById: user.id,
    },
    include: { category: { select: { name: true } } },
  });

  const userMap = await resolveUsernames([updated.createdById]);
  return toTreasuryEntryDTO(updated, userMap);
}

export async function softDeleteTreasuryEntry(
  id: string,
  user: AuthUser,
): Promise<void> {
  const existing = await prisma.treasuryEntry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    throw new HttpError(404, "NOT_FOUND", "Treasury entry not found.");
  }

  await prisma.treasuryEntry.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: user.id,
    },
  });
}
