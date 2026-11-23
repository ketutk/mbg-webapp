-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TournamentTeamStatus" AS ENUM ('ACTIVE', 'ELIMINATED', 'CHAMPION');

-- CreateEnum
CREATE TYPE "TournamentMatchStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'BYE');

-- CreateEnum
CREATE TYPE "BracketSection" AS ENUM ('MAIN', 'THIRD_PLACE');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "tier" INTEGER;

-- CreateTable
CREATE TABLE "PlayerTier" (
    "nameKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTier_pkey" PRIMARY KEY ("nameKey")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "preferredCourts" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT,
    "seed" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "status" "TournamentTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "eliminatedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "section" "BracketSection" NOT NULL DEFAULT 'MAIN',
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "label" TEXT,
    "status" "TournamentMatchStatus" NOT NULL DEFAULT 'PENDING',
    "teamAId" TEXT,
    "teamBId" TEXT,
    "winnerTeamId" TEXT,
    "isWalkover" BOOLEAN NOT NULL DEFAULT false,
    "gameId" TEXT,
    "nextMatchId" TEXT,
    "nextMatchSlot" "TeamSide",
    "loserNextMatchId" TEXT,
    "loserNextSlot" "TeamSide",

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_sessionId_idx" ON "Tournament"("sessionId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_status_idx" ON "TournamentTeam"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_seed_key" ON "TournamentTeam"("tournamentId", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_gameId_key" ON "TournamentMatch"("gameId");

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_status_idx" ON "TournamentMatch"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_tournamentId_section_round_slot_key" ON "TournamentMatch"("tournamentId", "section", "round", "slot");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
