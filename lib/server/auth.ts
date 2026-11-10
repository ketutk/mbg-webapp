import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./password";
import type { AuthUser } from "@/lib/types";

const COOKIE_NAME = "mbg_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

// Precomputed cost-12 bcrypt hash for constant-time dummy check when user is missing
const DUMMY_HASH =
  "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL8.9/2Hy";

export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = sha256(raw);
  const record = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) return null;
  if (record.expiresAt <= new Date() || record.user.deletedAt !== null) {
    await prisma.authToken.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  return {
    id: record.user.id,
    username: record.user.username,
    role: record.user.role,
  };
}

async function handleFailedLogin(
  user: { id: string; failedAttempts: number; lockedUntil: Date | null } | null,
  now: Date,
): Promise<never> {
  if (user) {
    const nextAttempts =
      user.lockedUntil && user.lockedUntil <= now ? 1 : user.failedAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: nextAttempts,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_WINDOW_MS) : null,
      },
    });
    if (shouldLock) {
      throw new HttpError(
        429,
        "TOO_MANY_ATTEMPTS",
        "Too many failed login attempts. Account locked for 15 minutes.",
      );
    }
  }
  throw new HttpError(401, "UNAUTHENTICATED", "Invalid username or password");
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<AuthUser> {
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { username } });

  if (user && user.deletedAt === null && user.lockedUntil && user.lockedUntil > now) {
    throw new HttpError(
      429,
      "TOO_MANY_ATTEMPTS",
      "Too many failed login attempts. Please try again in 15 minutes.",
    );
  }

  const valid = await verifyPassword(
    password,
    user && user.deletedAt === null ? user.passwordHash : DUMMY_HASH,
  );

  const activeUser = user && user.deletedAt === null ? user : null;
  if (!activeUser || !valid) {
    await handleFailedLogin(activeUser, now);
  }
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Invalid username or password");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(now.getTime() + MAX_AGE_SECONDS * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    }),
    prisma.authToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const jar = await cookies();
  jar.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export async function logoutCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    const tokenHash = sha256(raw);
    await prisma.authToken.deleteMany({ where: { tokenHash } });
  }
  jar.delete(COOKIE_NAME);
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt !== null) {
    throw new HttpError(401, "UNAUTHENTICATED", "Not logged in");
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw new HttpError(400, "VALIDATION", "Current password is incorrect", {
      currentPassword: "Current password is incorrect",
    });
  }

  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const currentHash = raw ? sha256(raw) : "";
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.authToken.deleteMany({
      where: {
        userId,
        ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
      },
    }),
  ]);
}

