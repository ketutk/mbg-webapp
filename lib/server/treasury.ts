import "server-only";
import { prisma } from "./db";
import { fromDateStr, toTreasuryEntryDTO } from "./dto";
import { HttpError } from "./http";
import type { TreasuryInput, TreasuryPatchInput } from "@/lib/schemas";
import type { AuthUser, TreasuryEntry, TreasurySummary } from "@/lib/types";

async function resolveUsernames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, username: true },
  });
  return new Map(users.map((u) => [u.id, u.username]));
}

export async function getTreasurySummary(): Promise<TreasurySummary> {
  const [entries, sums] = await Promise.all([
    prisma.treasuryEntry.findMany({
      where: { deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.treasuryEntry.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  for (const row of sums) {
    if (row.type === "INCOME") income = row._sum.amount ?? 0;
    if (row.type === "EXPENSE") expense = row._sum.amount ?? 0;
  }

  const userMap = await resolveUsernames(entries.map((e) => e.createdById));

  return {
    balance: income - expense,
    income,
    expense,
    entries: entries.map((e) => toTreasuryEntryDTO(e, userMap)),
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

