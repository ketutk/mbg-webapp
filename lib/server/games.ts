import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { toGameDTO, toSessionDTO } from "./dto";
import { HttpError } from "./http";
import type {
  AssignInput,
  GameUpdateInput,
  LockInput,
  QueueOrderInput,
  StartInput,
  TickInput,
} from "@/lib/schemas";
import type { Game, Session, Team } from "@/lib/types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

async function compactQueue(tx: TxClient, sessionId: string) {
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

function teamRows(teams: [Team, Team]) {
  return [
    { playerId: teams[0][0], team: "A" as const },
    { playerId: teams[0][1], team: "A" as const },
    { playerId: teams[1][0], team: "B" as const },
    { playerId: teams[1][1], team: "B" as const },
  ];
}

export async function assignGame(
  sessionId: string,
  input: AssignInput,
): Promise<Game> {
  const run = () =>
    prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          players: true,
          games: { include: { players: true } },
        },
      });
      if (!session) {
        throw new HttpError(404, "NOT_FOUND", "Session not found.");
      }

      const rosterMap = new Map(session.players.map((p) => [p.id, p.name]));
      const flatIds = input.teams.flat();
      for (const pid of flatIds) {
        if (!rosterMap.has(pid)) {
          throw new HttpError(
            400,
            "VALIDATION",
            "Selected player is not in this session roster.",
          );
        }
      }

      const maxSeq = session.games.reduce((m, g) => Math.max(m, g.seq), 0);
      const seq = maxSeq + 1;

      if (input.target.type === "court") {
        const { courtNumber } = input.target;
        if (courtNumber > session.courtCount) {
          throw new HttpError(
            400,
            "VALIDATION",
            `Court ${courtNumber} does not exist in this session.`,
          );
        }

        const occupied = session.games.find(
          (g) => g.status === "ON_COURT" && g.courtNumber === courtNumber,
        );
        if (occupied) {
          throw new HttpError(
            409,
            "COURT_OCCUPIED",
            `Court ${courtNumber} already has a match in progress.`,
          );
        }

        for (const g of session.games) {
          if (g.status !== "ON_COURT") continue;
          for (const gp of g.players) {
            if (flatIds.includes(gp.playerId)) {
              const name = rosterMap.get(gp.playerId) ?? "Player";
              throw new HttpError(
                409,
                "PLAYER_BUSY",
                `${name} is currently playing on Court ${g.courtNumber}.`,
              );
            }
          }
        }

        const created = await tx.game.create({
          data: {
            sessionId,
            seq,
            status: "ON_COURT",
            courtNumber,
            locked: true,
            startedAt: new Date(),
            players: { create: teamRows(input.teams) },
          },
          include: { players: true },
        });
        return toGameDTO(created);
      }

      const maxQueue = session.games
        .filter((g) => g.status === "QUEUED")
        .reduce((m, g) => Math.max(m, g.queueOrder ?? 0), 0);

      const created = await tx.game.create({
        data: {
          sessionId,
          seq,
          status: "QUEUED",
          queueOrder: maxQueue + 1,
          locked: true,
          players: { create: teamRows(input.teams) },
        },
        include: { players: true },
      });
      return toGameDTO(created);
    });

  try {
    return await run();
  } catch (err) {
    // Retry once on (sessionId, seq) unique constraint race
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return await run();
    }
    throw err;
  }
}

export async function updateGamePlayers(
  gameId: string,
  input: GameUpdateInput,
): Promise<Game> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: {
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

    const rosterMap = new Map(game.session.players.map((p) => [p.id, p.name]));
    const flatIds = input.teams.flat();
    for (const pid of flatIds) {
      if (!rosterMap.has(pid)) {
        throw new HttpError(
          400,
          "VALIDATION",
          "Selected player is not in this session roster.",
        );
      }
    }

    if (game.status === "ON_COURT") {
      for (const other of game.session.games) {
        if (other.id === gameId) continue;
        for (const gp of other.players) {
          if (flatIds.includes(gp.playerId)) {
            const name = rosterMap.get(gp.playerId) ?? "Player";
            throw new HttpError(
              409,
              "PLAYER_BUSY",
              `${name} is currently playing on Court ${other.courtNumber}.`,
            );
          }
        }
      }
    }

    await tx.gamePlayer.deleteMany({ where: { gameId } });
    const updated = await tx.game.update({
      where: { id: gameId },
      data: {
        locked: true,
        players: { create: teamRows(input.teams) },
      },
      include: { players: true },
    });

    return toGameDTO(updated);
  });
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

export async function deleteGameRecord(gameId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    await tx.game.delete({ where: { id: gameId } });
    if (game.status === "QUEUED") {
      await compactQueue(tx, game.sessionId);
    }
  });
}

export async function clearSessionGames(sessionId: string): Promise<void> {
  const existing = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  await prisma.game.deleteMany({ where: { sessionId } });
}

export async function setPlayerTick(
  gameId: string,
  playerId: string,
  input: TickInput,
): Promise<Game> {
  return prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game) {
      throw new HttpError(404, "NOT_FOUND", "Match not found.");
    }
    if (game.locked) {
      throw new HttpError(
        409,
        "GAME_LOCKED",
        "This match is locked. Unlock it first.",
      );
    }

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.sessionId !== game.sessionId) {
      throw new HttpError(404, "NOT_FOUND", "Player not found in this session.");
    }

    const hasTick = game.players.some((gp) => gp.playerId === playerId);
    if (hasTick === input.checked) {
      return toGameDTO(game);
    }

    if (input.checked) {
      await tx.gamePlayer.create({
        data: { gameId, playerId, team: null },
      });
    } else {
      await tx.gamePlayer.delete({
        where: { gameId_playerId: { gameId, playerId } },
      });
    }

    // Any manual tick change clears team assignments on the match
    await tx.gamePlayer.updateMany({
      where: { gameId },
      data: { team: null },
    });

    const newCount = await tx.gamePlayer.count({ where: { gameId } });
    const shouldLock = newCount === 4;

    const updated = await tx.game.update({
      where: { id: gameId },
      data: { locked: shouldLock },
      include: { players: true },
    });

    return toGameDTO(updated);
  });
}

export async function setGameLock(
  gameId: string,
  input: LockInput,
): Promise<Game> {
  const existing = await prisma.game.findUnique({ where: { id: gameId } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Match not found.");
  }
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { locked: input.locked },
    include: { players: true },
  });
  return toGameDTO(updated);
}

