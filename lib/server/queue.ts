import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { toGameDTO, toSessionDTO } from "./dto";
import { HttpError } from "./http";
import type { QueueOrderInput, StartInput } from "@/lib/schemas";
import type { Game, Session } from "@/lib/types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function compactQueue(tx: TxClient, sessionId: string) {
  const queued = await tx.game.findMany({
    where: { sessionId, status: "QUEUED" },
    orderBy: [{ queueOrder: "asc" }, { seq: "asc" }],
  });
  for (let i = 0; i < queued.length; i++) {
    if (queued[i].queueOrder !== i + 1) {
      await tx.game.update({
        where: { id: queued[i].id },
        data: { queueOrder: i + 1 },
      });
    }
  }
}

export async function startQueuedGame(
  gameId: string,
  input: StartInput,
): Promise<Game> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        session: {
          include: {
            players: true,
            games: { where: { status: "ON_COURT" }, include: { players: true } },
          },
        },
      },
    });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    if (game.status !== "QUEUED") {
      throw new HttpError(409, "INVALID_STATE", "Only queued matches can be started.");
    }
    if (input.courtNumber > game.session.courtCount) {
      throw new HttpError(
        400,
        "VALIDATION",
        `Court ${input.courtNumber} does not exist in this session.`,
      );
    }

    const occupied = game.session.games.find(
      (g) => g.courtNumber === input.courtNumber,
    );
    if (occupied) {
      throw new HttpError(
        409,
        "COURT_OCCUPIED",
        `Court ${input.courtNumber} already has a match in progress.`,
      );
    }

    const rosterMap = new Map(game.session.players.map((p) => [p.id, p.name]));
    const gamePlayerIds = new Set(game.players.map((gp) => gp.playerId));
    for (const onCourt of game.session.games) {
      for (const gp of onCourt.players) {
        if (gamePlayerIds.has(gp.playerId)) {
          const name = rosterMap.get(gp.playerId) ?? "Player";
          throw new HttpError(
            409,
            "PLAYER_BUSY",
            `${name} is currently playing on Court ${onCourt.courtNumber}.`,
          );
        }
      }
    }

    const updated = await tx.game.update({
      where: { id: gameId },
      data: {
        status: "ON_COURT",
        courtNumber: input.courtNumber,
        queueOrder: null,
        startedAt: new Date(),
      },
      include: { players: true },
    });

    await compactQueue(tx, game.sessionId);
    return toGameDTO(updated);
  });
}

export async function reorderSessionQueue(
  sessionId: string,
  input: QueueOrderInput,
): Promise<Session> {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        games: { where: { status: "QUEUED" } },
      },
    });
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Session not found.");
    }

    const currentIds = new Set(session.games.map((g) => g.id));
    if (
      input.gameIds.length !== currentIds.size ||
      new Set(input.gameIds).size !== currentIds.size ||
      input.gameIds.some((id) => !currentIds.has(id))
    ) {
      throw new HttpError(
        400,
        "VALIDATION",
        "Queue order must include all currently queued matches.",
      );
    }

    for (let i = 0; i < input.gameIds.length; i++) {
      await tx.game.update({
        where: { id: input.gameIds[i] },
        data: { queueOrder: i + 1 },
      });
    }

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

