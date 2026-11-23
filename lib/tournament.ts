import type { BracketSection, PlayerTierLevel, TournamentMatchStatus } from "./types";

export function shuffleArray<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface TieredPlayerCandidate {
  id: string;
  tier: PlayerTierLevel | null;
}

/**
 * Balanced Pairs Randomization (High + Low):
 * Groups players by tier (5 down to 1; unrated falls back to 3),
 * Fisher-Yates shuffles within each tier, flattens strongest-to-weakest,
 * and pairs outside-in (best + weakest) so every doubles team has a balanced tier sum.
 * Resulting teams are shuffled for bracket seeding.
 */
export function randomizeBalancedPairs(
  players: readonly TieredPlayerCandidate[],
): [TieredPlayerCandidate, TieredPlayerCandidate][] {
  if (players.length < 2 || players.length % 2 !== 0) {
    throw new Error("An even number of players is required to form pairs.");
  }

  const buckets = new Map<number, TieredPlayerCandidate[]>();
  for (const p of players) {
    const t = p.tier ?? 3;
    const list = buckets.get(t);
    if (list) list.push(p);
    else buckets.set(t, [p]);
  }

  const sorted: TieredPlayerCandidate[] = [];
  for (let t = 5; t >= 1; t--) {
    const group = buckets.get(t);
    if (group?.length) {
      sorted.push(...shuffleArray(group));
    }
  }

  const pairs: [TieredPlayerCandidate, TieredPlayerCandidate][] = [];
  const half = sorted.length / 2;
  for (let i = 0; i < half; i++) {
    pairs.push([sorted[i], sorted[sorted.length - 1 - i]]);
  }

  return shuffleArray(pairs);
}

/**
 * Auto-seed teams by combined tier sum descending, breaking ties randomly.
 */
export function seedTeamsByTier<
  T extends { id: string; tier1: number | null; tier2: number | null },
>(teams: readonly T[]): T[] {
  const shuffled = shuffleArray(teams);
  return shuffled.sort((a, b) => {
    const sumA = (a.tier1 ?? 3) + (a.tier2 ?? 3);
    const sumB = (b.tier1 ?? 3) + (b.tier2 ?? 3);
    return sumB - sumA;
  });
}

/**
 * Standard seeded bracket positions for a power-of-2 bracket size B.
 * Example B=8 -> [1, 8, 4, 5, 2, 7, 3, 6]
 * Ensures Seed 1 & Seed 2 are on opposite halves and only meet in the Final.
 */
function seededOrder(bracketSize: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < bracketSize) {
    const nextSize = seeds.length * 2;
    const expanded: number[] = [];
    for (const s of seeds) {
      expanded.push(s, nextSize + 1 - s);
    }
    seeds = expanded;
  }
  return seeds;
}

function roundPrefix(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinal";
  if (round === totalRounds - 2) return "Quarterfinal";
  const teamsInRound = 2 ** (totalRounds - round + 1);
  return `Round of ${teamsInRound}`;
}

export interface GeneratedBracketMatch {
  key: string;
  section: BracketSection;
  round: number;
  slot: number;
  label: string;
  status: TournamentMatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  nextMatchKey: string | null;
  nextMatchSlot: "A" | "B" | null;
  loserNextMatchKey: string | null;
  loserNextSlot: "A" | "B" | null;
}

/**
 * Generates a Single Elimination bracket for N >= 2 seeded teams,
 * automatically assigning Round 1 BYEs to top seeds and advancing them to Round 2.
 */
export function generateSingleEliminationBracket(
  teams: readonly { id: string; seed: number }[],
  hasThirdPlace: boolean,
): GeneratedBracketMatch[] {
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required to generate a bracket.");
  }

  const orderedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const n = orderedTeams.length;
  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = 2 ** totalRounds;
  const seedPositions = seededOrder(bracketSize);

  const bySeed = new Map<number, string>();
  orderedTeams.forEach((t, idx) => {
    bySeed.set(idx + 1, t.id);
  });

  const matches: GeneratedBracketMatch[] = [];
  const keyOf = (section: BracketSection, r: number, s: number) =>
    `${section}:${r}:${s}`;

  // Create empty match shells for all rounds 1..totalRounds
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = 2 ** (totalRounds - r);
    const prefix = roundPrefix(r, totalRounds);
    for (let s = 1; s <= matchCount; s++) {
      const label = matchCount === 1 ? prefix : `${prefix} ${s}`;
      const hasNext = r < totalRounds;
      matches.push({
        key: keyOf("MAIN", r, s),
        section: "MAIN",
        round: r,
        slot: s,
        label,
        status: "PENDING",
        teamAId: null,
        teamBId: null,
        winnerTeamId: null,
        nextMatchKey: hasNext
          ? keyOf("MAIN", r + 1, Math.ceil(s / 2))
          : null,
        nextMatchSlot: hasNext ? (s % 2 === 1 ? "A" : "B") : null,
        loserNextMatchKey: null,
        loserNextSlot: null,
      });
    }
  }

  // Optional 3rd place match fed by Semifinal losers
  if (hasThirdPlace && totalRounds >= 2) {
    const thirdKey = keyOf("THIRD_PLACE", 1, 1);
    matches.push({
      key: thirdKey,
      section: "THIRD_PLACE",
      round: 1,
      slot: 1,
      label: "3rd Place",
      status: "PENDING",
      teamAId: null,
      teamBId: null,
      winnerTeamId: null,
      nextMatchKey: null,
      nextMatchSlot: null,
      loserNextMatchKey: null,
      loserNextSlot: null,
    });

    const sfRound = totalRounds - 1;
    for (const m of matches) {
      if (m.section === "MAIN" && m.round === sfRound) {
        m.loserNextMatchKey = thirdKey;
        m.loserNextSlot = m.slot === 1 ? "A" : "B";
      }
    }
  }

  const byKey = new Map(matches.map((m) => [m.key, m]));

  // Populate Round 1 and process BYEs
  const r1Count = bracketSize / 2;
  for (let s = 1; s <= r1Count; s++) {
    const seedA = seedPositions[(s - 1) * 2];
    const seedB = seedPositions[(s - 1) * 2 + 1];
    const teamAId = bySeed.get(seedA) ?? null;
    const teamBId = bySeed.get(seedB) ?? null;
    const match = byKey.get(keyOf("MAIN", 1, s))!;

    match.teamAId = teamAId;
    match.teamBId = teamBId;

    if (teamAId && teamBId) {
      match.status = "READY";
    } else if (teamAId || teamBId) {
      const winnerId = teamAId ?? teamBId!;
      match.status = "BYE";
      match.winnerTeamId = winnerId;
      if (match.nextMatchKey && match.nextMatchSlot) {
        const next = byKey.get(match.nextMatchKey)!;
        if (match.nextMatchSlot === "A") next.teamAId = winnerId;
        else next.teamBId = winnerId;
      }
    }
  }

  // Mark any Round 2+ match that already has both teams from BYEs as READY
  for (const m of matches) {
    if (m.status === "PENDING" && m.teamAId && m.teamBId) {
      m.status = "READY";
    }
  }

  return matches;
}
