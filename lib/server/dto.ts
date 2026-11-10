import "server-only";
import type {
  Game as PrismaGame,
  GamePlayer as PrismaGamePlayer,
  Player as PrismaPlayer,
  Session as PrismaSession,
  TreasuryEntry as PrismaTreasuryEntry,
  User as PrismaUser,
} from "@prisma/client";
import type {
  AdminUser,
  Game,
  PublicGame,
  Session,
  SessionListItem,
  SessionSummary,
  Team,
  TreasuryEntry,
} from "@/lib/types";

export const toDateStr = (d: Date): string => d.toISOString().slice(0, 10);

export const fromDateStr = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

type GameWithPlayers = PrismaGame & { players: PrismaGamePlayer[] };
type SessionWithCounts = PrismaSession & {
  _count: { players: number; games: number };
};
type SessionWithRelations = PrismaSession & {
  players: PrismaPlayer[];
  games: GameWithPlayers[];
};

function extractTeams(players: PrismaGamePlayer[]): [Team, Team] | undefined {
  if (players.length !== 4) return undefined;
  const teamA: string[] = [];
  const teamB: string[] = [];
  for (const gp of players) {
    if (gp.team === "A") teamA.push(gp.playerId);
    else if (gp.team === "B") teamB.push(gp.playerId);
    else return undefined;
  }
  if (teamA.length !== 2 || teamB.length !== 2) return undefined;
  return [
    [teamA[0], teamA[1]],
    [teamB[0], teamB[1]],
  ];
}

export function toGameDTO(game: GameWithPlayers): Game {
  const teams = extractTeams(game.players);
  return {
    id: game.id,
    playerIds: game.players.map((gp) => gp.playerId),
    ...(teams ? { teams } : {}),
    createdAt: game.createdAt.getTime(),
    ...(game.startedAt ? { startedAt: game.startedAt.getTime() } : {}),
    ...(game.finishedAt ? { finishedAt: game.finishedAt.getTime() } : {}),
    status: game.status,
    ...(game.status === "ON_COURT" && game.courtNumber != null
      ? { courtNumber: game.courtNumber }
      : {}),
    ...(game.status === "QUEUED" && game.queueOrder != null
      ? { queueOrder: game.queueOrder }
      : {}),
    locked: game.locked,
  };
}

export function toPublicGameDTO(game: GameWithPlayers): PublicGame {
  const teams = extractTeams(game.players);
  return {
    id: game.id,
    status: game.status === "ON_COURT" ? "ON_COURT" : "QUEUED",
    ...(game.status === "ON_COURT" && game.courtNumber != null
      ? { courtNumber: game.courtNumber }
      : {}),
    ...(game.status === "QUEUED" && game.queueOrder != null
      ? { queueOrder: game.queueOrder }
      : {}),
    playerIds: game.players.map((gp) => gp.playerId),
    ...(teams ? { teams } : {}),
  };
}

export function toSessionListItemDTO(
  session: SessionWithCounts,
): SessionListItem {
  return {
    id: session.id,
    name: session.name,
    date: toDateStr(session.date),
    courtCount: session.courtCount,
    status: session.status,
    playerCount: session._count.players,
    gameCount: session._count.games,
  };
}

export function toSessionDTO(session: SessionWithRelations): Session {
  const players = [...session.players]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, name: p.name }));
  const games = [...session.games]
    .sort((a, b) => a.seq - b.seq)
    .map(toGameDTO);

  return {
    id: session.id,
    name: session.name,
    date: toDateStr(session.date),
    courtCount: session.courtCount,
    status: session.status,
    players,
    games,
  };
}

export function toSessionSummaryDTO(session: SessionWithRelations): SessionSummary {
  const countMap = new Map<string, number>();
  const queuedMap = new Map<string, number>();

  for (const g of session.games) {
    for (const gp of g.players) {
      countMap.set(gp.playerId, (countMap.get(gp.playerId) ?? 0) + 1);
      if (g.status === "QUEUED") {
        queuedMap.set(gp.playerId, (queuedMap.get(gp.playerId) ?? 0) + 1);
      }
    }
  }

  const players = [...session.players]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      count: countMap.get(p.id) ?? 0,
      queued: queuedMap.get(p.id) ?? 0,
    }));

  const courts = session.games
    .filter((g) => g.status === "ON_COURT")
    .sort((a, b) => (a.courtNumber ?? 0) - (b.courtNumber ?? 0))
    .map(toPublicGameDTO);

  const queue = session.games
    .filter((g) => g.status === "QUEUED")
    .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0) || a.seq - b.seq)
    .map(toPublicGameDTO);

  return {
    id: session.id,
    name: session.name,
    date: toDateStr(session.date),
    courtCount: session.courtCount,
    status: session.status,
    players,
    courts,
    queue,
  };
}

export function toTreasuryEntryDTO(
  entry: PrismaTreasuryEntry,
  userMap: ReadonlyMap<string, string>,
): TreasuryEntry {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    purpose: entry.purpose,
    date: toDateStr(entry.date),
    createdByName: userMap.get(entry.createdById) ?? "Admin",
  };
}

export function toAdminUserDTO(user: PrismaUser): AdminUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: toDateStr(user.createdAt),
    deletedAt: user.deletedAt ? toDateStr(user.deletedAt) : null,
  };
}

