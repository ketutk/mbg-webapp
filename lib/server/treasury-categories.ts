import "server-only";
import { prisma } from "./db";
import { toTreasuryCategoryDTO } from "./dto";
import { HttpError } from "./http";
import type {
  TreasuryCategoryInput,
  TreasuryCategoryPatchInput,
} from "@/lib/schemas";
import type { AuthUser, TreasuryCategory } from "@/lib/types";

export async function listTreasuryCategories(): Promise<TreasuryCategory[]> {
  const rows = await prisma.treasuryCategory.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  return rows.map(toTreasuryCategoryDTO);
}

export async function createTreasuryCategory(
  input: TreasuryCategoryInput,
  user: AuthUser,
): Promise<TreasuryCategory> {
  const nameKey = input.name.trim().toLocaleLowerCase();
  const existing = await prisma.treasuryCategory.findUnique({
    where: { nameKey },
  });
  if (existing) {
    throw new HttpError(
      409,
      "NAME_TAKEN",
      "A category with this name already exists.",
      { name: "Category name already exists" },
    );
  }

  const created = await prisma.treasuryCategory.create({
    data: {
      name: input.name,
      nameKey,
      type: input.type ?? null,
      isSystem: false,
      createdById: user.id,
    },
  });
  return toTreasuryCategoryDTO(created);
}

export async function updateTreasuryCategory(
  id: string,
  input: TreasuryCategoryPatchInput,
): Promise<TreasuryCategory> {
  const existing = await prisma.treasuryCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Category not found.");
  }

  let nextNameKey = existing.nameKey;
  if (input.name !== undefined) {
    nextNameKey = input.name.trim().toLocaleLowerCase();
    const conflict = await prisma.treasuryCategory.findUnique({
      where: { nameKey: nextNameKey },
    });
    if (conflict && conflict.id !== id) {
      throw new HttpError(
        409,
        "NAME_TAKEN",
        "A category with this name already exists.",
        { name: "Category name already exists" },
      );
    }
  }

  const updated = await prisma.treasuryCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name, nameKey: nextNameKey } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
  });
  return toTreasuryCategoryDTO(updated);
}

export async function deleteTreasuryCategory(id: string): Promise<void> {
  const existing = await prisma.treasuryCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Category not found.");
  }
  if (existing.isSystem) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Default club categories cannot be deleted.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const others = await tx.treasuryCategory.findUnique({
      where: { nameKey: "others" },
      select: { id: true },
    });
    await tx.treasuryEntry.updateMany({
      where: { categoryId: id },
      data: { categoryId: others?.id ?? null },
    });
    await tx.treasuryCategory.delete({ where: { id } });
  });
}
