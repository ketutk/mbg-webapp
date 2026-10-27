import type { Player, Session, Team } from "./types";

export interface PlayerStat {
  player: Player;
  /** How many games this player has played (checked) in the session. */
  count: number;
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
    let last = -1;
    session.games.forEach((g, i) => {
      if (g.playerIds.includes(player.id)) {
        count++;
        last = i;
      }
    });
    return { player, count, last };
  });
}

export function fairnessGap(stats: PlayerStat[]) {
  if (!stats.length) return { min: 0, max: 0, gap: 0 };
  const counts = stats.map((s) => s.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return { min, max, gap: max - min };
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
 * The four picked players are split into teams that repeat past partners the least.
 */
export function recommend(session: Session, seed = 0): Recommendation | null {
  if (session.players.length < 4) return null;

  const ranked = getStats(session).sort(
    (a, b) =>
      a.count - b.count ||
      a.last - b.last ||
      rand(a.player.id, seed) - rand(b.player.id, seed),
  );

  const picked = ranked.slice(0, 4).map((s) => s.player);
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
    queue: ranked.slice(4),
    level: fairnessGap(ranked).gap === 0,
  };
}
