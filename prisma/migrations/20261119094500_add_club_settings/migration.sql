-- CreateTable
CREATE TABLE "ClubSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "schedule" TEXT NOT NULL DEFAULT 'Sundays',
    "venue" TEXT NOT NULL DEFAULT 'Local badminton court',
    "skillLevel" TEXT NOT NULL DEFAULT 'All levels, beginner to intermediate doubles',
    "whatsappUrl" TEXT,
    "ayoUrl" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSettings_pkey" PRIMARY KEY ("id")
);
