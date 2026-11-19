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

  const defaultCategories = [
    { id: "cat_booking", name: "Booking", nameKey: "booking", type: "EXPENSE" as const },
    { id: "cat_shuttlecock", name: "Shuttlecock", nameKey: "shuttlecock", type: "EXPENSE" as const },
    { id: "cat_water", name: "Water", nameKey: "water", type: "EXPENSE" as const },
    { id: "cat_player_payment", name: "Player Payment", nameKey: "player payment", type: "INCOME" as const },
    { id: "cat_others", name: "Others", nameKey: "others", type: null },
  ];

  for (const cat of defaultCategories) {
    await prisma.treasuryCategory.upsert({
      where: { nameKey: cat.nameKey },
      update: { name: cat.name, type: cat.type, isSystem: true },
      create: {
        id: cat.id,
        name: cat.name,
        nameKey: cat.nameKey,
        type: cat.type,
        isSystem: true,
      },
    });
  }

  console.log(`Seeded ${defaultCategories.length} default treasury categories`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

