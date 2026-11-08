import "server-only";
import { prisma } from "./db";
import { toAdminUserDTO } from "./dto";
import { HttpError } from "./http";
import { hashPassword } from "./password";
import type { AdminCreateInput, AdminPasswordInput } from "@/lib/schemas";
import type { AdminUser } from "@/lib/types";

export async function listAdmins(): Promise<AdminUser[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return users.map(toAdminUserDTO);
}

export async function createAdminUser(
  input: AdminCreateInput,
  creatorId: string,
): Promise<AdminUser> {
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    throw new HttpError(
      409,
      "NAME_TAKEN",
      `Username “${input.username}” is already reserved.`,
      { username: "Username is already taken" },
    );
  }

  const passwordHash = await hashPassword(input.password);
  const created = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      role: "ADMIN",
      createdById: creatorId,
    },
  });

  return toAdminUserDTO(created);
}

export async function softDeleteAdminUser(
  targetId: string,
  actorId: string,
): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    throw new HttpError(404, "NOT_FOUND", "Admin account not found.");
  }
  if (target.id === actorId || target.role === "SUPERADMIN") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Superadmin accounts cannot be deleted.",
    );
  }
  if (target.deletedAt !== null) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    }),
    prisma.authToken.deleteMany({
      where: { userId: targetId },
    }),
  ]);
}

export async function resetAdminUserPassword(
  targetId: string,
  input: AdminPasswordInput,
): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.deletedAt !== null) {
    throw new HttpError(404, "NOT_FOUND", "Active admin account not found.");
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.authToken.deleteMany({
      where: { userId: targetId },
    }),
  ]);
}

