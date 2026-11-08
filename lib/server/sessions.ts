import "server-only";
import { prisma } from "./db";
import {
  fromDateStr,
  toSessionDTO,
  toSessionListItemDTO,
  toSessionSummaryDTO,
} from "./dto";
import { HttpError } from "./http";
import type {
  RosterInput,
  SessionInput,
  SessionPatchInput,
} from "@/lib/schemas";
import type { Session, SessionListItem, SessionSummary } from "@/lib/types";

const sessionInclude = {
  players: { orderBy: { position: "asc" as const } },
  games: {
    orderBy: { seq: "asc" as const },
    include: { players: true },
  },
};

function dedupeNames(names: string[]): { name: string; nameKey: string }[] {
  const seen = new Set<string>();
  const out: { name: string; nameKey: string }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const nameKey = name.toLocaleLowerCase();
    if (name && !seen.has(nameKey)) {
      seen.add(nameKey);
      out.push({ name, nameKey });
    }
  }
  return out;
}

export async function listSessions(): Promise<SessionListItem[]> {
  const rows = await prisma.session.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toSessionListItemDTO);
}

export async function getSessionSummary(id: string): Promise<SessionSummary> {
  const row = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!row) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  return toSessionSummaryDTO(row);
}

export async function getSessionDetail(id: string): Promise<Session> {
  const row = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!row) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  return toSessionDTO(row);
}

export async function createSessionRecord(
  input: SessionInput,
  userId: string,
): Promise<Session> {
  const uniquePlayers = dedupeNames(input.names);
  const created = await prisma.session.create({
    data: {
      name: input.name,
      date: fromDateStr(input.date),
      courtCount: input.courtCount,
      createdById: userId,
      players: {
        create: uniquePlayers.map((p, index) => ({
          name: p.name,
          nameKey: p.nameKey,
          position: index,
        })),
      },
    },
    include: sessionInclude,
  });
  return toSessionDTO(created);
}

export async function updateSessionRecord(
  id: string,
  input: SessionPatchInput,
): Promise<Session> {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({
      where: { id },
      include: {
        games: { where: { status: "ON_COURT" } },
      },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Session not found.");
    }

    if (input.courtCount !== undefined) {
      const highestOccupied = existing.games.reduce(
        (max, g) => Math.max(max, g.courtNumber ?? 0),
        0,
      );
      if (input.courtCount < highestOccupied) {
        throw new HttpError(
          409,
          "COURT_OCCUPIED",
          `Cannot lower court count below ${highestOccupied} while Court ${highestOccupied} has a match on court.`,
        );
      }
    }

    return tx.session.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.date !== undefined ? { date: fromDateStr(input.date) } : {}),
        ...(input.courtCount !== undefined ? { courtCount: input.courtCount } : {}),
      },
      include: sessionInclude,
    });
  });

  return toSessionDTO(updated);
}

export async function deleteSessionRecord(id: string): Promise<void> {
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  await prisma.session.delete({ where: { id } });
}

export async function replaceSessionRoster(
  id: string,
  input: RosterInput,
): Promise<Session> {
  const uniquePlayers = dedupeNames(input.names);

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({
      where: { id },
      include: {
        players: true,
        games: { include: { players: true } },
      },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Session not found.");
    }

    const prevByKey = new Map(existing.players.map((p) => [p.nameKey, p]));
    const keptIds = new Set<string>();
    for (const p of uniquePlayers) {
      const match = prevByKey.get(p.nameKey);
      if (match) keptIds.add(match.id);
    }

    const removedIds = existing.players
      .filter((p) => !keptIds.has(p.id))
      .map((p) => p.id);

    if (removedIds.length > 0) {
      const removedSet = new Set(removedIds);
      const affectedGameIds = existing.games
        .filter((g) => g.players.some((gp) => removedSet.has(gp.playerId)))
        .map((g) => g.id);

      if (affectedGameIds.length > 0) {
        await tx.game.updateMany({
          where: { id: { in: affectedGameIds } },
          data: { locked: false },
        });
        await tx.gamePlayer.updateMany({
          where: { gameId: { in: affectedGameIds } },
          data: { team: null },
        });
      }

      await tx.player.deleteMany({
        where: { id: { in: removedIds } },
      });
    }

    for (let i = 0; i < uniquePlayers.length; i++) {
      const { name, nameKey } = uniquePlayers[i];
      const prev = prevByKey.get(nameKey);
      if (prev) {
        await tx.player.update({
          where: { id: prev.id },
          data: { name, position: i },
        });
      } else {
        await tx.player.create({
          data: { sessionId: id, name, nameKey, position: i },
        });
      }
    }

    return tx.session.findUniqueOrThrow({
      where: { id },
      include: sessionInclude,
    });
  });

  return toSessionDTO(updated);
}

