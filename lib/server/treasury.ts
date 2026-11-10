import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { fromDateStr, toDateStr, toTreasuryEntryDTO } from "./dto";
import { HttpError } from "./http";
import type { TreasuryInput, TreasuryPatchInput } from "@/lib/schemas";
import type {
  AuthUser,
  TreasuryEntry,
  TreasuryFilterParams,
  TreasuryMonthlyBucket,
  TreasurySummary,
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

function buildRecentMonths(anchorYm: string, count = 6): string[] {
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

function buildTreasuryWhere(params: TreasuryFilterParams): Prisma.TreasuryEntryWhereInput {
  const fromStr = params.from && DATE_RE.test(params.from) ? params.from : undefined;
  const toStr = params.to && DATE_RE.test(params.to) ? params.to : undefined;
  const typeFilter =
    params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;
  const qFilter = params.q?.trim() || undefined;

  return {
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
    ...(qFilter ? { purpose: { contains: qFilter, mode: "insensitive" } } : {}),
  };
}

function computeMonthlyBuckets(
  items: { date: Date; type: "INCOME" | "EXPENSE"; amount: number }[],
): TreasuryMonthlyBucket[] {
  const latestYm = items[0]
    ? toDateStr(items[0].date).slice(0, 7)
    : toDateStr(new Date()).slice(0, 7);
  const monthKeys = buildRecentMonths(latestYm, 6);
  const bucketMap = new Map<string, TreasuryMonthlyBucket>(
    monthKeys.map((m) => [m, { month: m, income: 0, expense: 0 }]),
  );

  for (const item of items) {
    const ym = toDateStr(item.date).slice(0, 7);
    const bucket = bucketMap.get(ym);
    if (!bucket) continue;
    if (item.type === "INCOME") bucket.income += item.amount;
    else bucket.expense += item.amount;
  }

  return Array.from(bucketMap.values());
}

function extractSums(
  allTime: { type: "INCOME" | "EXPENSE"; _sum: { amount: number | null } }[],
  period: { type: "INCOME" | "EXPENSE"; _sum: { amount: number | null }; _count: { _all: number } }[],
) {
  const income = allTime.find((r) => r.type === "INCOME")?._sum.amount ?? 0;
  const expense = allTime.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0;
  const pInc = period.find((r) => r.type === "INCOME");
  const pExp = period.find((r) => r.type === "EXPENSE");
  return {
    income,
    expense,
    periodIncome: pInc?._sum.amount ?? 0,
    periodIncomeCount: pInc?._count._all ?? 0,
    periodExpense: pExp?._sum.amount ?? 0,
    periodExpenseCount: pExp?._count._all ?? 0,
  };
}

export async function getTreasurySummary(
  params: TreasuryFilterParams = {},
): Promise<TreasurySummary> {
  const pageSize = Math.min(100, Math.max(5, Math.trunc(params.pageSize || 10)));
  const requestedPage = Math.max(1, Math.trunc(params.page || 1));
  const filteredWhere = buildTreasuryWhere(params);

  const [allTimeSums, periodSums, totalEntries, allActiveForChart] =
    await Promise.all([
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
      prisma.treasuryEntry.count({ where: filteredWhere }),
      prisma.treasuryEntry.findMany({
        where: { deletedAt: null },
        select: { date: true, type: true, amount: true },
        orderBy: { date: "desc" },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const entries = await prisma.treasuryEntry.findMany({
    where: filteredWhere,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const sums = extractSums(allTimeSums, periodSums);
  const userMap = await resolveUsernames(entries.map((e) => e.createdById));

  return {
    balance: sums.income - sums.expense,
    income: sums.income,
    expense: sums.expense,
    periodIncome: sums.periodIncome,
    periodExpense: sums.periodExpense,
    periodNet: sums.periodIncome - sums.periodExpense,
    periodIncomeCount: sums.periodIncomeCount,
    periodExpenseCount: sums.periodExpenseCount,
    monthly: computeMonthlyBuckets(allActiveForChart),
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
  const created = await prisma.treasuryEntry.create({
    data: {
      type: input.type,
      amount: input.amount,
      purpose: input.purpose,
      date: fromDateStr(input.date),
      createdById: user.id,
    },
  });
  return toTreasuryEntryDTO(created, new Map([[user.id, user.username]]));
}

export async function updateTreasuryEntry(
  id: string,
  input: TreasuryPatchInput,
  user: AuthUser,
): Promise<TreasuryEntry> {
  const existing = await prisma.treasuryEntry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    throw new HttpError(404, "NOT_FOUND", "Treasury entry not found.");
  }

  const updated = await prisma.treasuryEntry.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.date !== undefined ? { date: fromDateStr(input.date) } : {}),
      updatedById: user.id,
    },
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

