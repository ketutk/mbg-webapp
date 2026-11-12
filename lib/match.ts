import type { Game, Player, Session, Team } from "./types";

export interface PlayerStat {
  player: Player;
  /** How many games this player has played (checked) in the session, including queued. */
  count: number;
  /** How many currently QUEUED games this player is checked in. */
  queued: number;
  /** Index of the last game played, -1 if never. */
  last: number;
}

export interface Recommendation {
  teams: [[Player, Player], [Player, Player]];
  /** The 4 recommended players. */
  players: Player[];
  /** Everyone else, ordered by who should get on court next. */
  queue: PlayerStat[];
  /** True when every player has played the same amount of games. */
  level: boolean;
}

export function getStats(session: Session): PlayerStat[] {
  return session.players.map((player) => {
    let count = 0;
    let queued = 0;
    let last = -1;
    session.games.forEach((g, i) => {
      if (g.playerIds.includes(player.id)) {
        count++;
        if (g.status === "QUEUED") queued++;
        last = i;
      }
    });
    return { player, count, queued, last };
  });
}

export function fairnessGap(stats: { count: number }[]) {
  if (!stats.length) return { min: 0, max: 0, gap: 0 };
  const counts = stats.map((s) => s.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return { min, max, gap: max - min };
}

/** Map of playerId -> courtNumber for everyone currently ON_COURT. */
export function busyPlayers(session: Session, excludeGameId?: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of session.games) {
    if (g.status !== "ON_COURT" || g.id === excludeGameId) continue;
    const court = g.courtNumber ?? 1;
    for (const pid of g.playerIds) {
      map.set(pid, court);
    }
  }
  return map;
}

/** Courts 1..courtCount with their current ON_COURT game (if any). */
export function courtsOf(
  session: Session,
): { courtNumber: number; game: Game | null }[] {
  const byCourt = new Map<number, Game>();
  for (const g of session.games) {
    if (g.status === "ON_COURT" && g.courtNumber != null) {
      byCourt.set(g.courtNumber, g);
    }
  }
  const count = Math.max(1, session.courtCount || 1);
  return Array.from({ length: count }, (_, i) => {
    const courtNumber = i + 1;
    return { courtNumber, game: byCourt.get(courtNumber) ?? null };
  });
}

/** Queued matches ordered by queueOrder then creation sequence. */
export function queueOf(session: Session): Game[] {
  return session.games
    .filter((g) => g.status === "QUEUED")
    .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0));
}

/** Small deterministic hash -> [0, 1). Lets "shuffle" change tie-breaks reproducibly. */
function rand(key: string, seed: number) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function partnerHistory(session: Session) {
  const map = new Map<string, number>();
  for (const g of session.games) {
    if (!g.teams) continue;
    for (const [a, b] of g.teams) {
      const k = pairKey(a, b);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }
  return map;
}

/**
 * Recommend the next doubles match so everyone ends up with the same number of games:
 *  1. fewest games played first
 *  2. then the player who has rested the longest (hasn't played for the most games)
 *  3. then a seeded random tie-break (change `seed` to shuffle ties)
 * Players currently ON_COURT (`busy`) are excluded when at least 4 other players remain.
 * The four picked players are split into teams that repeat past partners the least.
 */
export function recommend(
  session: Session,
  seed = 0,
  busy: ReadonlySet<string> = new Set(busyPlayers(session).keys()),
): Recommendation | null {
  if (session.players.length < 4) return null;

  const ranked = getStats(session).sort(
    (a, b) =>
      a.count - b.count ||
      a.last - b.last ||
      rand(a.player.id, seed) - rand(b.player.id, seed),
  );

  const available = busy.size ? ranked.filter((s) => !busy.has(s.player.id)) : ranked;
  const pool = available.length >= 4 ? available : ranked;

  const picked = pool.slice(0, 4).map((s) => s.player);
  const pickedSet = new Set(picked.map((p) => p.id));
  const [a, b, c, d] = picked;
  const history = partnerHistory(session);

  const options: [Team, Team][] = [
    [[a.id, b.id], [c.id, d.id]],
    [[a.id, c.id], [b.id, d.id]],
    [[a.id, d.id], [b.id, c.id]],
  ];
  const score = ([t1, t2]: [Team, Team]) =>
    (history.get(pairKey(...t1)) ?? 0) +
    (history.get(pairKey(...t2)) ?? 0) +
    rand(`${t1}${t2}`, seed) * 0.5;
  const best = options.reduce((x, y) => (score(y) < score(x) ? y : x));

  const byId = new Map(picked.map((p) => [p.id, p]));
  const teams: Recommendation["teams"] = [
    [byId.get(best[0][0])!, byId.get(best[0][1])!],
    [byId.get(best[1][0])!, byId.get(best[1][1])!],
  ];

  return {
    teams,
    players: picked,
    queue: ranked.filter((s) => !pickedSet.has(s.player.id)),
    level: fairnessGap(ranked).gap === 0,
  };
}

export function prefillFromRec(
  rec: Recommendation | null,
): [Team, Team] | undefined {
  return rec
    ? [
        [rec.teams[0][0].id, rec.teams[0][1].id],
        [rec.teams[1][0].id, rec.teams[1][1].id],
      ]
    : undefined;
}

