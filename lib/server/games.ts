import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { toGameDTO } from "./dto";
import { HttpError } from "./http";
import type { AssignInput, GameUpdateInput } from "@/lib/schemas";
import type { Game, Team } from "@/lib/types";

export * from "./queue";
export * from "./game-actions";

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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return run();
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
            games: {
              where: { id: { not: gameId }, status: "ON_COURT" },
              include: { players: true },
            },
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
