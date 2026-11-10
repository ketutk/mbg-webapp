import "server-only";
import { prisma } from "./db";
import { toGameDTO, toSessionDTO } from "./dto";
import { HttpError } from "./http";
import { compactQueue } from "./queue";
import type { LockInput, TickInput } from "@/lib/schemas";
import type { Game, Session } from "@/lib/types";

export async function finishOnCourtGame(gameId: string): Promise<Game> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    if (game.status !== "ON_COURT") {
      throw new HttpError(409, "INVALID_STATE", "Match is not currently on a court.");
    }

    const updated = await tx.game.update({
      where: { id: gameId },
      data: {
        status: "DONE",
        courtNumber: null,
        finishedAt: new Date(),
      },
      include: { players: true },
    });

    return toGameDTO(updated);
  });
}

export async function setGameLock(
  gameId: string,
  input: LockInput,
): Promise<Game> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    throw new HttpError(404, "NOT_FOUND", "Match not found.");
  }
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { locked: input.locked },
    include: { players: true },
  });
  return toGameDTO(updated);
}

export async function setPlayerTick(
  gameId: string,
  playerId: string,
  input: TickInput,
): Promise<Game> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { players: true, session: { include: { players: true } } },
    });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    if (game.locked) {
      throw new HttpError(
        409,
        "GAME_LOCKED",
        "This game column is locked. Unlock it to change ticks.",
      );
    }
    const inRoster = game.session.players.some((p) => p.id === playerId);
    if (!inRoster) {
      throw new HttpError(400, "VALIDATION", "Player not in this session roster.");
    }

    const currentPlayers = game.players;
    const exists = currentPlayers.some((p) => p.playerId === playerId);

    if (input.checked && !exists) {
      const teamA = currentPlayers.filter((p) => p.team === "A").length;
      const teamB = currentPlayers.filter((p) => p.team === "B").length;
      const team = teamA <= teamB ? ("A" as const) : ("B" as const);
      await tx.gamePlayer.create({
        data: { gameId, playerId, team },
      });
    } else if (!input.checked && exists) {
      await tx.gamePlayer.delete({
        where: { gameId_playerId: { gameId, playerId } },
      });
    }

    const updated = await tx.game.findUniqueOrThrow({
      where: { id: gameId },
      include: { players: true },
    });

    if (updated.players.length === 4 && !updated.locked) {
      const autoLocked = await tx.game.update({
        where: { id: gameId },
        data: { locked: true },
        include: { players: true },
      });
      return toGameDTO(autoLocked);
    }

    return toGameDTO(updated);
  });
}

export async function deleteGameRecord(gameId: string): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    await tx.game.delete({ where: { id: gameId } });
    if (game.status === "QUEUED") {
      await compactQueue(tx, game.sessionId);
    }
    return { id: gameId };
  });
}

export async function clearSessionGames(sessionId: string): Promise<Session> {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Session not found.");
    }
    await tx.game.deleteMany({ where: { sessionId } });
    const full = await tx.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        players: { orderBy: { position: "asc" } },
        games: { orderBy: { seq: "asc" }, include: { players: true } },
      },
    });
    return toSessionDTO(full);
  });
}

