-- CreateTable
CREATE TABLE "TreasuryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "type" "EntryType",
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TreasuryEntry" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryCategory_nameKey_key" ON "TreasuryCategory"("nameKey");

-- CreateIndex
CREATE INDEX "TreasuryCategory_type_idx" ON "TreasuryCategory"("type");

-- CreateIndex
CREATE INDEX "TreasuryEntry_categoryId_idx" ON "TreasuryEntry"("categoryId");

-- AddForeignKey
ALTER TABLE "TreasuryEntry" ADD CONSTRAINT "TreasuryEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TreasuryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default categories
INSERT INTO "TreasuryCategory" ("id", "name", "nameKey", "type", "isSystem")
VALUES
    ('cat_booking', 'Booking', 'booking', 'EXPENSE', true),
    ('cat_shuttlecock', 'Shuttlecock', 'shuttlecock', 'EXPENSE', true),
    ('cat_water', 'Water', 'water', 'EXPENSE', true),
    ('cat_player_payment', 'Player Payment', 'player payment', 'INCOME', true),
    ('cat_others', 'Others', 'others', NULL, true)
ON CONFLICT ("nameKey") DO NOTHING;

-- Backfill existing entries to "Others"
UPDATE "TreasuryEntry"
SET "categoryId" = (SELECT "id" FROM "TreasuryCategory" WHERE "nameKey" = 'others')
WHERE "categoryId" IS NULL;
