import "server-only";
import type {
  Game as PrismaGame,
  GamePlayer as PrismaGamePlayer,
  Player as PrismaPlayer,
  Session as PrismaSession,
  Tournament as PrismaTournament,
  TournamentMatch as PrismaTournamentMatch,
  TournamentTeam as PrismaTournamentTeam,
  TreasuryCategory as PrismaTreasuryCategory,
  TreasuryEntry as PrismaTreasuryEntry,
  User as PrismaUser,
} from "@prisma/client";
import type {
  AdminUser,
  Game,
  GameTournamentTag,
  PlayerTierLevel,
  PublicGame,
  Session,
  SessionListItem,
  SessionSummary,
  Team,
  TournamentDetail,
  TournamentListItem,
  TournamentMatch,
  TournamentTeam,
  TreasuryCategory,
  TreasuryEntry,
} from "@/lib/types";

export const toDateStr = (d: Date): string => d.toISOString().slice(0, 10);

export const fromDateStr = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

type GameTournamentRelation = {
  id: string;
  label: string | null;
  tournament: { id: string; name: string };
} | null;

type GameWithPlayers = PrismaGame & {
  players: PrismaGamePlayer[];
  tournamentMatch?: GameTournamentRelation;
};

function extractTournamentTag(
  tm: GameTournamentRelation | undefined,
): GameTournamentTag | undefined {
  if (!tm) return undefined;
  return {
    tournamentId: tm.tournament.id,
    tournamentName: tm.tournament.name,
    matchId: tm.id,
    label: tm.label ?? "Match",
  };
}
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
  const tournament = extractTournamentTag(game.tournamentMatch);
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
    ...(game.scoreA != null ? { scoreA: game.scoreA } : {}),
    ...(game.scoreB != null ? { scoreB: game.scoreB } : {}),
    locked: game.locked,
    ...(tournament ? { tournament } : {}),
  };
}

export function toPublicGameDTO(game: GameWithPlayers): PublicGame {
  const teams = extractTeams(game.players);
  const tournament = extractTournamentTag(game.tournamentMatch);
  return {
    id: game.id,
    status: game.status,
    ...(game.status === "ON_COURT" && game.courtNumber != null
      ? { courtNumber: game.courtNumber }
      : {}),
    ...(game.status === "QUEUED" && game.queueOrder != null
      ? { queueOrder: game.queueOrder }
      : {}),
    createdAt: game.createdAt.getTime(),
    ...(game.startedAt ? { startedAt: game.startedAt.getTime() } : {}),
    ...(game.finishedAt ? { finishedAt: game.finishedAt.getTime() } : {}),
    ...(game.scoreA != null ? { scoreA: game.scoreA } : {}),
    ...(game.scoreB != null ? { scoreB: game.scoreB } : {}),
    playerIds: game.players.map((gp) => gp.playerId),
    ...(teams ? { teams } : {}),
    ...(tournament ? { tournament } : {}),
  };
}

export function toSessionListItemDTO(
  session: SessionWithCounts,
): SessionListItem {
  return {
    id: session.id,
    slug: session.slug,
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
    .map((p) => ({
      id: p.id,
      name: p.name,
      paid: p.paid,
      tier: (p.tier as PlayerTierLevel | null) ?? null,
    }));
  const games = [...session.games]
    .sort((a, b) => a.seq - b.seq)
    .map(toGameDTO);

  return {
    id: session.id,
    slug: session.slug,
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
  const winsMap = new Map<string, number>();
  const lossesMap = new Map<string, number>();

  for (const g of session.games) {
    const winnerTeam =
      g.status === "DONE" &&
      g.scoreA != null &&
      g.scoreB != null &&
      g.scoreA !== g.scoreB
        ? g.scoreA > g.scoreB
          ? "A"
          : "B"
        : null;

    for (const gp of g.players) {
      countMap.set(gp.playerId, (countMap.get(gp.playerId) ?? 0) + 1);
      if (g.status === "QUEUED") {
        queuedMap.set(gp.playerId, (queuedMap.get(gp.playerId) ?? 0) + 1);
      }
      if (winnerTeam && (gp.team === "A" || gp.team === "B")) {
        if (gp.team === winnerTeam) {
          winsMap.set(gp.playerId, (winsMap.get(gp.playerId) ?? 0) + 1);
        } else {
          lossesMap.set(gp.playerId, (lossesMap.get(gp.playerId) ?? 0) + 1);
        }
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
      wins: winsMap.get(p.id) ?? 0,
      losses: lossesMap.get(p.id) ?? 0,
    }));

  const courts = session.games
    .filter((g) => g.status === "ON_COURT")
    .sort((a, b) => (a.courtNumber ?? 0) - (b.courtNumber ?? 0))
    .map(toPublicGameDTO);

  const queue = session.games
    .filter((g) => g.status === "QUEUED")
    .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0) || a.seq - b.seq)
    .map(toPublicGameDTO);

  const games = [...session.games]
    .sort((a, b) => a.seq - b.seq)
    .map(toPublicGameDTO);

  return {
    id: session.id,
    slug: session.slug,
    name: session.name,
    date: toDateStr(session.date),
    courtCount: session.courtCount,
    status: session.status,
    players,
    courts,
    queue,
    games,
  };
}

export function toTreasuryCategoryDTO(
  cat: PrismaTreasuryCategory,
): TreasuryCategory {
  return {
    id: cat.id,
    name: cat.name,
    type: cat.type,
    isSystem: cat.isSystem,
  };
}

export function toTreasuryEntryDTO(
  entry: PrismaTreasuryEntry & { category?: { name: string } | null },
  userMap: ReadonlyMap<string, string>,
): TreasuryEntry {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    purpose: entry.purpose,
    date: toDateStr(entry.date),
    categoryId: entry.categoryId,
    categoryName: entry.category?.name ?? "Others",
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

type TournamentTeamWithPlayers = PrismaTournamentTeam & {
  player1: PrismaPlayer;
  player2: PrismaPlayer;
};

type TournamentMatchWithGame = PrismaTournamentMatch & {
  game: PrismaGame | null;
};

export function toTournamentListItemDTO(
  t: PrismaTournament & {
    session: PrismaSession;
    teams: (PrismaTournamentTeam & {
      player1: { name: string };
      player2: { name: string };
    })[];
    matches: Pick<PrismaTournamentMatch, "id" | "status">[];
  },
): TournamentListItem {
  const playableMatches = t.matches.filter((m) => m.status !== "BYE");
  const completedMatchCount = playableMatches.filter(
    (m) => m.status === "COMPLETED",
  ).length;
  const champion = t.teams.find((team) => team.status === "CHAMPION");
  const championName = champion
    ? champion.name || `${champion.player1.name} & ${champion.player2.name}`
    : null;

  const activePlayerIds: string[] = [];
  if (t.status === "IN_PROGRESS") {
    for (const team of t.teams) {
      if (team.status === "ACTIVE") {
        activePlayerIds.push(team.player1Id, team.player2Id);
      }
    }
  }

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    format: t.format,
    status: t.status,
    hasThirdPlace: t.hasThirdPlace,
    sessionId: t.sessionId,
    sessionSlug: t.session.slug,
    sessionName: t.session.name,
    sessionDate: toDateStr(t.session.date),
    sessionStatus: t.session.status,
    teamCount: t.teams.length,
    completedMatchCount,
    totalMatchCount: playableMatches.length,
    championName,
    activePlayerIds,
  };
}

export interface TournamentSessionAggregates {
  gameCountMap: ReadonlyMap<string, number>;
  occupiedCourts: number[];
  busyPlayerIds: string[];
}

export function toTournamentDetailDTO(
  t: PrismaTournament & {
    session: PrismaSession & {
      players: PrismaPlayer[];
      games?: GameWithPlayers[];
    };
    teams: TournamentTeamWithPlayers[];
    matches: TournamentMatchWithGame[];
  },
  includeTiers: boolean,
  aggregates?: TournamentSessionAggregates,
): TournamentDetail {
  let gameCountMap: ReadonlyMap<string, number>;
  let occupiedCourts: number[];
  let busyPlayerIds: string[];

  if (aggregates) {
    gameCountMap = aggregates.gameCountMap;
    occupiedCourts = [...aggregates.occupiedCourts].sort((a, b) => a - b);
    busyPlayerIds = [...aggregates.busyPlayerIds];
  } else {
    const counts = new Map<string, number>();
    const occupied: number[] = [];
    const busy = new Set<string>();
    for (const g of t.session.games ?? []) {
      if (g.status === "ON_COURT") {
        if (g.courtNumber != null) occupied.push(g.courtNumber);
        for (const gp of g.players) busy.add(gp.playerId);
      }
      for (const gp of g.players) {
        counts.set(gp.playerId, (counts.get(gp.playerId) ?? 0) + 1);
      }
    }
    gameCountMap = counts;
    occupiedCourts = occupied.sort((a, b) => a - b);
    busyPlayerIds = [...busy];
  }

  const sessionPlayers = [...t.session.players]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      ...(includeTiers ? { tier: (p.tier as PlayerTierLevel | null) ?? null } : {}),
      sessionGamesCount: gameCountMap.get(p.id) ?? 0,
    }));

  const teams: TournamentTeam[] = [...t.teams]
    .sort((a, b) => a.seed - b.seed)
    .map((team) => {
      const t1 = (team.player1.tier as PlayerTierLevel | null) ?? null;
      const t2 = (team.player2.tier as PlayerTierLevel | null) ?? null;
      return {
        id: team.id,
        seed: team.seed,
        name: team.name,
        displayName:
          team.name || `${team.player1.name} & ${team.player2.name}`,
        status: team.status,
        eliminatedAt: team.eliminatedAt
          ? team.eliminatedAt.toISOString()
          : null,
        ...(includeTiers
          ? { tierSum: t1 != null && t2 != null ? t1 + t2 : null }
          : {}),
        player1: {
          id: team.player1.id,
          name: team.player1.name,
          ...(includeTiers ? { tier: t1 } : {}),
          sessionGamesCount: gameCountMap.get(team.player1.id) ?? 0,
        },
        player2: {
          id: team.player2.id,
          name: team.player2.name,
          ...(includeTiers ? { tier: t2 } : {}),
          sessionGamesCount: gameCountMap.get(team.player2.id) ?? 0,
        },
      };
    });

  const matches: TournamentMatch[] = [...t.matches]
    .sort(
      (a, b) =>
        (a.section === b.section ? 0 : a.section === "MAIN" ? -1 : 1) ||
        a.round - b.round ||
        a.slot - b.slot,
    )
    .map((m) => ({
      id: m.id,
      section: m.section,
      round: m.round,
      slot: m.slot,
      playOrder: m.playOrder ?? null,
      label: m.label ?? `Round ${m.round} · ${m.slot}`,
      status: m.status,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      winnerTeamId: m.winnerTeamId,
      isWalkover: m.isWalkover,
      gameId: m.gameId,
      courtNumber: m.game?.status === "ON_COURT" ? m.game.courtNumber : null,
      queueOrder: m.game?.status === "QUEUED" ? m.game.queueOrder : null,
      scoreA: m.game?.scoreA ?? null,
      scoreB: m.game?.scoreB ?? null,
      nextMatchId: m.nextMatchId,
      nextMatchSlot: m.nextMatchSlot,
      loserNextMatchId: m.loserNextMatchId,
      loserNextSlot: m.loserNextSlot,
    }));

  const activePlayerIds: string[] = [];
  if (t.status === "IN_PROGRESS") {
    for (const team of t.teams) {
      if (team.status === "ACTIVE") {
        activePlayerIds.push(team.player1Id, team.player2Id);
      }
    }
  }

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    format: t.format,
    status: t.status,
    hasThirdPlace: t.hasThirdPlace,
    preferredCourts: t.preferredCourts,
    session: {
      id: t.session.id,
      slug: t.session.slug,
      name: t.session.name,
      date: toDateStr(t.session.date),
      courtCount: t.session.courtCount,
      status: t.session.status,
      occupiedCourts,
      busyPlayerIds,
    },
    sessionPlayers,
    teams,
    matches,
    activePlayerIds,
  };
}

