import "server-only";
import type { Prisma } from "@prisma/client";
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
import type {
  AuthUser,
  Session,
  SessionSummary,
  SessionsFilterParams,
  SessionsPage,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function buildDateRangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const fromValid = from && DATE_RE.test(from) ? from : undefined;
  const toValid = to && DATE_RE.test(to) ? to : undefined;
  if (!fromValid && !toValid) return undefined;
  return {
    ...(fromValid ? { gte: fromDateStr(fromValid) } : {}),
    ...(toValid ? { lte: fromDateStr(toValid) } : {}),
  };
}

function resolveStatusFilter(status: string | undefined, isOrganiser: boolean) {
  if (!isOrganiser) return "OPEN" as const;
  if (status === "OPEN" || status === "CLOSED") return status;
  return undefined;
}

function buildSessionFilters(params: SessionsFilterParams, isOrganiser: boolean) {
  const dateFilter = buildDateRangeFilter(params.from, params.to);
  const qFilter = params.q?.trim() || undefined;
  const statusFilter = resolveStatusFilter(params.status, isOrganiser);

  const baseWhere: Prisma.SessionWhereInput = {
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(qFilter ? { name: { contains: qFilter, mode: "insensitive" } } : {}),
  };

  const filteredWhere: Prisma.SessionWhereInput = {
    ...baseWhere,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  return { baseWhere, filteredWhere };
}

export async function listSessions(
  params: SessionsFilterParams = {},
  user: AuthUser | null = null,
): Promise<SessionsPage> {
  const isOrganiser = user !== null;
  const pageSize = Math.min(100, Math.max(5, Math.trunc(params.pageSize || 10)));
  const requestedPage = Math.max(1, Math.trunc(params.page || 1));

  const { baseWhere, filteredWhere } = buildSessionFilters(params, isOrganiser);

  const [totalSessions, statusCounts] = await Promise.all([
    prisma.session.count({ where: filteredWhere }),
    prisma.session.groupBy({
      by: ["status"],
      where: isOrganiser ? baseWhere : { ...baseWhere, status: "OPEN" },
      _count: { _all: true },
    }),
  ]);

  let openCount = 0;
  let closedCount = 0;
  for (const row of statusCounts) {
    if (row.status === "OPEN") openCount = row._count._all;
    if (row.status === "CLOSED") closedCount = isOrganiser ? row._count._all : 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalSessions / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.session.findMany({
    where: filteredWhere,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      _count: {
        select: { players: true, games: true },
      },
    },
  });

  return {
    sessions: rows.map(toSessionListItemDTO),
    totalSessions,
    openCount,
    closedCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getSessionSummary(
  id: string,
  user: AuthUser | null = null,
): Promise<SessionSummary> {
  const row = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!row) {
    throw new HttpError(404, "NOT_FOUND", "Session not found.");
  }
  if (row.status === "CLOSED" && !user) {
    throw new HttpError(
      403,
      "SESSION_CLOSED",
      "This session is closed and only visible to organisers.",
    );
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
      status: input.status ?? "OPEN",
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
  user: AuthUser,
): Promise<Session> {
  const isSuperadmin = user.role === "SUPERADMIN";
  if (
    !isSuperadmin &&
    (input.name !== undefined ||
      input.date !== undefined ||
      input.courtCount !== undefined)
  ) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only superadmins can edit session name, date, or court count.",
    );
  }

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
        ...(input.status !== undefined ? { status: input.status } : {}),
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

