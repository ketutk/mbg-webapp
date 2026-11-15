import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const TX_OPTIONS = {
  maxWait: 10_000, // max time to wait to acquire a connection from the pool
  timeout: 10_000, // max time the transaction may run
} as const;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  transactionOptions:TX_OPTIONS
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

