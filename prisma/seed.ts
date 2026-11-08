import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { passwordSchema, usernameSchema } from "../lib/schemas";

const prisma = new PrismaClient();

async function main() {
  const rawUser = process.env.SUPERADMIN_USERNAME;
  const rawPass = process.env.SUPERADMIN_PASSWORD;

  if (!rawUser || !rawPass) {
    throw new Error(
      "Missing SUPERADMIN_USERNAME or SUPERADMIN_PASSWORD environment variables",
    );
  }

  const username = usernameSchema.parse(rawUser);
  const password = passwordSchema.parse(rawPass);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: "SUPERADMIN",
      deletedAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
    create: {
      username,
      passwordHash,
      role: "SUPERADMIN",
    },
  });

  console.log(`Seeded superadmin: ${user.username} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

