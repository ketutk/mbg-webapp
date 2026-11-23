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
const quartetKey = (ids: readonly string[]) => [...ids].sort().join("|");

interface InteractionHistory {
  partner: Map<string, number>;
  together: Map<string, number>;
  quartet: Map<string, number>;
}

function interactionHistory(session: Session): InteractionHistory {
  const partner = new Map<string, number>();
  const together = new Map<string, number>();
  const quartet = new Map<string, number>();

  for (const g of session.games) {
    const ids = g.playerIds;
    if (ids.length === 4) {
      const qk = quartetKey(ids);
      quartet.set(qk, (quartet.get(qk) ?? 0) + 1);
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pk = pairKey(ids[i], ids[j]);
        together.set(pk, (together.get(pk) ?? 0) + 1);
      }
    }
    if (g.teams) {
      for (const [a, b] of g.teams) {
        const pk = pairKey(a, b);
        partner.set(pk, (partner.get(pk) ?? 0) + 1);
      }
    }
  }

  return { partner, together, quartet };
}

const MAX_CANDIDATES = 8;

interface IndexedStat {
  stat: PlayerStat;
  cohort: number;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const out: T[][] = [];
  const chosen: T[] = [];
  function walk(start: number) {
    if (chosen.length === k) {
      out.push([...chosen]);
      return;
    }
    const need = k - chosen.length;
    for (let i = start; i <= items.length - need; i++) {
      chosen.push(items[i]);
      walk(i + 1);
      chosen.pop();
    }
  }
  walk(0);
  return out;
}

function groupByLast(tier: readonly PlayerStat[]): PlayerStat[][] {
  const cohorts: PlayerStat[][] = [];
  for (const s of tier) {
    const prev = cohorts[cohorts.length - 1];
    if (prev && prev[0].last === s.last) {
      prev.push(s);
    } else {
      cohorts.push([s]);
    }
  }
  return cohorts;
}

/**
 * Strictly honors game-count tiers while opening a bounded 2-cohort window
 * whenever the oldest played cohort would otherwise trap the exact same pod.
 * Any cohort smaller than the remaining slots is locked in first so no player
 * ever waits more than one extra game.
 */
function buildCandidateSet(pool: readonly PlayerStat[]) {
  const mandatory: IndexedStat[] = [];
  let offset = 0;
  let globalCohort = 0;

  // Lock full count tiers strictly smaller than what we still need to reach 4.
  while (mandatory.length < 4 && offset < pool.length) {
    const tierCount = pool[offset].count;
    let end = offset;
    while (end < pool.length && pool[end].count === tierCount) end++;
    const tier = pool.slice(offset, end);
    const remaining = 4 - mandatory.length;

    if (tier.length <= remaining) {
      for (const c of groupByLast(tier)) {
        for (const stat of c) mandatory.push({ stat, cohort: globalCohort });
        globalCohort++;
      }
      offset = end;
      continue;
    }

    const cohorts = groupByLast(tier);
    let slotsLeft = remaining;
    for (let i = 0; i < cohorts.length && slotsLeft > 0; i++) {
      const c = cohorts[i];
      const cohortId = globalCohort++;

      if (c[0].last === -1) {
        if (c.length >= slotsLeft) {
          const flex = c.slice(0, MAX_CANDIDATES).map((stat) => ({
            stat,
            cohort: cohortId,
          }));
          return { mandatory, flex, slotsLeft, oldestCohort: -1, minFromOldest: 0 };
        }
        for (const stat of c) mandatory.push({ stat, cohort: cohortId });
        slotsLeft -= c.length;
        continue;
      }

      if (c.length < slotsLeft) {
        for (const stat of c) mandatory.push({ stat, cohort: cohortId });
        slotsLeft -= c.length;
        continue;
      }

      const next = cohorts[i + 1];
      const shouldWiden =
        slotsLeft > 1 && next !== undefined && c.length <= Math.max(slotsLeft, 5);
      if (!shouldWiden) {
        const flex = c.slice(0, MAX_CANDIDATES).map((stat) => ({
          stat,
          cohort: cohortId,
        }));
        return { mandatory, flex, slotsLeft, oldestCohort: cohortId, minFromOldest: 0 };
      }

      const nextId = globalCohort++;
      const minNext = Math.min(next.length, slotsLeft);
      const room = Math.max(minNext, MAX_CANDIDATES - c.length);
      const flex: IndexedStat[] = [
        ...c.map((stat) => ({ stat, cohort: cohortId })),
        ...next.slice(0, room).map((stat) => ({ stat, cohort: nextId })),
      ];
      return {
        mandatory,
        flex,
        slotsLeft,
        oldestCohort: cohortId,
        minFromOldest: Math.ceil(slotsLeft / 2),
      };
    }
    break;
  }

  return {
    mandatory,
    flex: [] as IndexedStat[],
    slotsLeft: 0,
    oldestCohort: -1,
    minFromOldest: 0,
  };
}

interface CandidateMatch {
  quartet: PlayerStat[];
  teams: [PlayerStat[], PlayerStat[]];
  qKey: string;
  splitKey: string;
  score: number;
}

function evaluateMatchOption(
  quartet: readonly IndexedStat[],
  split: readonly [readonly IndexedStat[], readonly IndexedStat[]],
  history: InteractionHistory,
  lastGameIndex: number,
  seed: number,
): CandidateMatch {
  const ids = quartet.map((q) => q.stat.player.id);
  const qk = quartetKey(ids);
  const t1Ids: [string, string] = [
    split[0][0].stat.player.id,
    split[0][1].stat.player.id,
  ];
  const t2Ids: [string, string] = [
    split[1][0].stat.player.id,
    split[1][1].stat.player.id,
  ];
  const s1 = [...t1Ids].sort().join("|");
  const s2 = [...t2Ids].sort().join("|");
  const splitKey = s1 < s2 ? `${s1}::${s2}` : `${s2}::${s1}`;

  const quartetRepeats = history.quartet.get(qk) ?? 0;

  let togetherRepeats = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      togetherRepeats += history.together.get(pairKey(ids[i], ids[j])) ?? 0;
    }
  }

  const partnerRepeats =
    (history.partner.get(pairKey(...t1Ids)) ?? 0) +
    (history.partner.get(pairKey(...t2Ids)) ?? 0);

  // Detect pod concentration from any single played game.
  const byLastGame = new Map<number, number>();
  let backToBackCount = 0;
  let cohortScore = 0;
  for (const item of quartet) {
    cohortScore += item.cohort;
    const last = item.stat.last;
    if (last >= 0) {
      byLastGame.set(last, (byLastGame.get(last) ?? 0) + 1);
      if (last === lastGameIndex) backToBackCount++;
    }
  }
  const maxSameGame = Math.max(0, ...byLastGame.values());
  const podPenalty = maxSameGame >= 4 ? 35 : maxSameGame === 3 ? 12 : 0;

  const score =
    quartetRepeats * 60 +
    podPenalty +
    partnerRepeats * 14 +
    togetherRepeats * 4 +
    backToBackCount * 8 +
    cohortScore * 5 +
    rand(splitKey, seed === 0 ? 0 : 1) * 0.1;

  return {
    quartet: quartet.map((q) => q.stat),
    teams: [
      [split[0][0].stat, split[0][1].stat],
      [split[1][0].stat, split[1][1].stat],
    ],
    qKey: qk,
    splitKey,
    score,
  };
}

/**
 * Recommend the next doubles match so everyone ends up with balanced game counts
 * while mixing cohorts and avoiding repeated foursomes, partners, and opponents:
 *  1. Strict priority for fewest games played (`count`).
 *  2. Bounded rest window (oldest cohort is never skipped more than 1 extra game).
 *  3. Within eligible candidates, minimize quartet/pod/partner/opponent repeats.
 *  4. Clicking Shuffle (`seed > 0`) rotates through top distinct combinations.
 */
export function recommend(
  session: Session,
  seed = 0,
  busy: ReadonlySet<string> = new Set(busyPlayers(session).keys()),
  excludePlayerIds: ReadonlySet<string> = new Set(),
): Recommendation | null {
  const eligiblePlayers = excludePlayerIds.size
    ? session.players.filter((p) => !excludePlayerIds.has(p.id))
    : session.players;
  if (eligiblePlayers.length < 4) return null;

  const history = interactionHistory(session);
  const ranked = getStats(session)
    .filter((s) => !excludePlayerIds.has(s.player.id))
    .sort(
      (a, b) =>
        a.count - b.count ||
        a.last - b.last ||
        rand(a.player.id, seed) - rand(b.player.id, seed),
    );

  const available = busy.size
    ? ranked.filter((s) => !busy.has(s.player.id))
    : ranked;
  const pool = available.length >= 4 ? available : ranked;

  const { mandatory, flex, slotsLeft, oldestCohort, minFromOldest } =
    buildCandidateSet(pool);

  const flexCombos =
    slotsLeft > 0 ? combinations(flex, slotsLeft) : ([[]] as IndexedStat[][]);

  const validQuartets = flexCombos
    .filter((combo) => {
      if (minFromOldest <= 0) return true;
      const countOldest = combo.filter((x) => x.cohort === oldestCohort).length;
      return countOldest >= minFromOldest;
    })
    .map((combo) => [...mandatory, ...combo]);

  const lastGameIndex = session.games.length - 1;
  const evaluated: CandidateMatch[] = [];
  for (const quartet of validQuartets) {
    const [a, b, c, d] = quartet;
    const splits: [readonly [IndexedStat, IndexedStat], readonly [IndexedStat, IndexedStat]][] = [
      [
        [a, b],
        [c, d],
      ],
      [
        [a, c],
        [b, d],
      ],
      [
        [a, d],
        [b, c],
      ],
    ];
    for (const split of splits) {
      evaluated.push(
        evaluateMatchOption(quartet, split, history, lastGameIndex, seed),
      );
    }
  }

  evaluated.sort((x, y) => x.score - y.score);

  let chosen = evaluated[0];
  if (seed > 0 && evaluated.length > 1) {
    const bestPerQuartet: CandidateMatch[] = [];
    const seenQ = new Set<string>();
    const bestScore = evaluated[0].score;
    for (const opt of evaluated) {
      if (seenQ.has(opt.qKey)) continue;
      seenQ.add(opt.qKey);
      if (opt.score <= bestScore + 45 || bestPerQuartet.length < 4) {
        bestPerQuartet.push(opt);
      }
      if (bestPerQuartet.length >= 8) break;
    }

    if (bestPerQuartet.length > 1) {
      chosen = bestPerQuartet[seed % bestPerQuartet.length];
    } else {
      // Only one 4-player quartet is eligible; rotate among its team splits.
      const distinctSplits: CandidateMatch[] = [];
      const seenS = new Set<string>();
      for (const opt of evaluated) {
        if (!seenS.has(opt.splitKey)) {
          seenS.add(opt.splitKey);
          distinctSplits.push(opt);
        }
      }
      chosen = distinctSplits[seed % distinctSplits.length];
    }
  }

  const picked = chosen.quartet.map((s) => s.player);
  const pickedSet = new Set(picked.map((p) => p.id));
  const teams: Recommendation["teams"] = [
    [chosen.teams[0][0].player, chosen.teams[0][1].player],
    [chosen.teams[1][0].player, chosen.teams[1][1].player],
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

