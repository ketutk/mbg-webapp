-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "Session_status_date_idx" ON "Session"("status", "date");
