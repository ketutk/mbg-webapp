import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { fromDateStr, toTournamentDetailDTO, toTournamentListItemDTO } from "./dto";
import { HttpError } from "./http";
import {
  generateSingleEliminationBracket,
  randomizeBalancedPairs,
  seedTeamsByTier,
  shuffleArray,
} from "@/lib/tournament";
import type {
  TournamentCreateInput,
  TournamentMatchAssignInput,
  TournamentPatchInput,
  TournamentRandomizeInput,
  TournamentTeamAddInput,
  TournamentTeamsReorderInput,
} from "@/lib/schemas";
import type {
  AuthUser,
  PlayerTierLevel,
  TournamentDetail,
  TournamentListItem,
  TournamentStatus,
} from "@/lib/types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

const tournamentDetailInclude = {
  session: {
    include: {
      players: { orderBy: { position: "asc" as const } },
      games: {
        orderBy: { seq: "asc" as const },
        include: {
          players: true,
          tournamentMatch: {
            select: {
              id: true,
              label: true,
              tournament: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  teams: {
    orderBy: { seed: "asc" as const },
    include: { player1: true, player2: true },
  },
  matches: {
    orderBy: [{ section: "asc" as const }, { round: "asc" as const }, { slot: "asc" as const }],
    include: { game: true },
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

/**
 * Shared atomic progression helper called by both `finishOnCourtGame()` and
 * `walkoverTournamentMatch()` so bracket state always stays in sync with Session games.
 */
export async function advanceTournamentMatch(
  tx: TxClient,
  matchId: string,
  winnerSide: "A" | "B",
): Promise<void> {
  const match = await tx.tournamentMatch.findUnique({
    where: { id: matchId },
  });
  if (!match) {
    throw new HttpError(404, "NOT_FOUND", "Tournament match not found.");
  }
  if (match.status === "COMPLETED" || match.status === "BYE") {
    throw new HttpError(409, "INVALID_STATE", "Tournament match is already finished.");
  }
  if (!match.teamAId || !match.teamBId) {
    throw new HttpError(409, "INVALID_STATE", "Both teams must be assigned before finishing.");
  }

  const winnerTeamId = winnerSide === "A" ? match.teamAId : match.teamBId;
  const loserTeamId = winnerSide === "A" ? match.teamBId : match.teamAId;

  await tx.tournamentMatch.update({
    where: { id: match.id },
    data: { status: "COMPLETED", winnerTeamId },
  });

  // Advance winner to next round (or crown Champion if Final)
  if (match.nextMatchId && match.nextMatchSlot) {
    const nextMatch = await tx.tournamentMatch.findUniqueOrThrow({
      where: { id: match.nextMatchId },
    });
    const nextData =
      match.nextMatchSlot === "A"
        ? { teamAId: winnerTeamId }
        : { teamBId: winnerTeamId };
    const otherSidePresent =
      match.nextMatchSlot === "A" ? Boolean(nextMatch.teamBId) : Boolean(nextMatch.teamAId);
    await tx.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: {
        ...nextData,
        ...(otherSidePresent && nextMatch.status === "PENDING"
          ? { status: "READY" }
          : {}),
      },
    });
  } else if (match.section === "MAIN") {
    await tx.tournamentTeam.update({
      where: { id: winnerTeamId },
      data: { status: "CHAMPION" },
    });
  }

  // Handle loser: either route to 3rd-place match or mark ELIMINATED (returns to casual pool!)
  if (match.loserNextMatchId && match.loserNextSlot) {
    const loserNext = await tx.tournamentMatch.findUniqueOrThrow({
      where: { id: match.loserNextMatchId },
    });
    const loserData =
      match.loserNextSlot === "A"
        ? { teamAId: loserTeamId }
        : { teamBId: loserTeamId };
    const otherSidePresent =
      match.loserNextSlot === "A"
        ? Boolean(loserNext.teamBId)
        : Boolean(loserNext.teamAId);
    await tx.tournamentMatch.update({
      where: { id: loserNext.id },
      data: {
        ...loserData,
        ...(otherSidePresent && loserNext.status === "PENDING"
          ? { status: "READY" }
          : {}),
      },
    });
  } else {
    await tx.tournamentTeam.update({
      where: { id: loserTeamId },
      data: { status: "ELIMINATED", eliminatedAt: new Date() },
    });
  }

  // Check if all matches in this tournament are finished
  const remaining = await tx.tournamentMatch.count({
    where: {
      tournamentId: match.tournamentId,
      status: { notIn: ["COMPLETED", "BYE"] },
    },
  });
  if (remaining === 0) {
    await tx.tournament.update({
      where: { id: match.tournamentId },
      data: { status: "COMPLETED" },
    });
  }
}

export async function listTournaments(
  params: { sessionId?: string; status?: TournamentStatus } = {},
  user: AuthUser | null = null,
): Promise<TournamentListItem[]> {
  const isOrganiser = user !== null;
  const rows = await prisma.tournament.findMany({
    where: {
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(isOrganiser
        ? {}
        : {
            status: { in: ["IN_PROGRESS", "COMPLETED"] },
            session: { status: "OPEN" },
          }),
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      session: true,
      teams: {
        include: {
          player1: { select: { name: true } },
          player2: { select: { name: true } },
        },
      },
      matches: { select: { id: true, status: true } },
    },
  });

  return rows.map(toTournamentListItemDTO);
}

export async function getTournamentDetail(
  id: string,
  user: AuthUser | null = null,
): Promise<TournamentDetail> {
  const row = await prisma.tournament.findUnique({
    where: { id },
    include: tournamentDetailInclude,
  });
  if (!row) {
    throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
  }
  if (!user && row.session.status === "CLOSED") {
    throw new HttpError(
      403,
      "SESSION_CLOSED",
      "This tournament belongs to a closed session and is only visible to organisers.",
    );
  }
  if (!user && row.status === "DRAFT") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Draft tournaments are only visible to organisers.",
    );
  }
  return toTournamentDetailDTO(row, user !== null);
}

export async function createTournament(
  input: TournamentCreateInput,
  userId: string,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    let sessionId = input.sessionId;

    if (!sessionId && input.createSession) {
      const uniquePlayers = dedupeNames(input.createSession.names);
      const nameKeys = uniquePlayers.map((p) => p.nameKey);
      const savedTiers = nameKeys.length
        ? await tx.playerTier.findMany({ where: { nameKey: { in: nameKeys } } })
        : [];
      const tierMap = new Map(savedTiers.map((t) => [t.nameKey, t.tier]));

      const createdSession = await tx.session.create({
        data: {
          name: input.createSession.name,
          date: fromDateStr(input.createSession.date),
          courtCount: input.createSession.courtCount,
          status: input.createSession.status ?? "OPEN",
          createdById: userId,
          players: {
            create: uniquePlayers.map((p, index) => ({
              name: p.name,
              nameKey: p.nameKey,
              position: index,
              tier: tierMap.get(p.nameKey) ?? null,
            })),
          },
        },
      });
      sessionId = createdSession.id;
    }

    if (!sessionId) {
      throw new HttpError(400, "VALIDATION", "Session is required.");
    }

    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Linked session not found.");
    }

    const preferredCourts = [...new Set(input.preferredCourts ?? [])].filter(
      (c) => c >= 1 && c <= session.courtCount,
    );

    const created = await tx.tournament.create({
      data: {
        name: input.name,
        sessionId: session.id,
        hasThirdPlace: input.hasThirdPlace ?? false,
        preferredCourts,
        createdById: userId,
      },
      include: tournamentDetailInclude,
    });

    return toTournamentDetailDTO(created, true);
  }, TX_OPTIONS);
}

export async function updateTournament(
  id: string,
  input: TournamentPatchInput,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.tournament.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (input.hasThirdPlace !== undefined && existing.status !== "DRAFT") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "3rd place setting can only be changed while in Draft.",
      );
    }

    const preferredCourts = input.preferredCourts
      ? [...new Set(input.preferredCourts)].filter(
          (c) => c >= 1 && c <= existing.session.courtCount,
        )
      : undefined;

    const updated = await tx.tournament.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.hasThirdPlace !== undefined
          ? { hasThirdPlace: input.hasThirdPlace }
          : {}),
        ...(preferredCourts !== undefined ? { preferredCourts } : {}),
      },
      include: tournamentDetailInclude,
    });

    return toTournamentDetailDTO(updated, true);
  }, TX_OPTIONS);
}

export async function deleteTournament(id: string): Promise<void> {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
  }
  await prisma.tournament.delete({ where: { id } });
}

export async function addTournamentTeam(
  tournamentId: string,
  input: TournamentTeamAddInput,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { session: { include: { players: true } }, teams: true },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status !== "DRAFT") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Teams can only be edited while tournament is in Draft.",
      );
    }

    const sessionPlayerIds = new Set(t.session.players.map((p) => p.id));
    if (
      !sessionPlayerIds.has(input.player1Id) ||
      !sessionPlayerIds.has(input.player2Id)
    ) {
      throw new HttpError(
        400,
        "VALIDATION",
        "Both players must belong to the linked session roster.",
      );
    }

    for (const existingTeam of t.teams) {
      if (
        existingTeam.player1Id === input.player1Id ||
        existingTeam.player2Id === input.player1Id ||
        existingTeam.player1Id === input.player2Id ||
        existingTeam.player2Id === input.player2Id
      ) {
        throw new HttpError(
          409,
          "PLAYER_ALREADY_TEAMED",
          "One of the selected players is already in a team in this tournament.",
        );
      }
    }

    const nextSeed = t.teams.reduce((m, team) => Math.max(m, team.seed), 0) + 1;
    await tx.tournamentTeam.create({
      data: {
        tournamentId,
        seed: nextSeed,
        player1Id: input.player1Id,
        player2Id: input.player2Id,
        name: input.name?.trim() || null,
      },
    });

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function randomizeTournamentTeams(
  tournamentId: string,
  input: TournamentRandomizeInput,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { session: { include: { players: true } }, teams: true },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status !== "DRAFT") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Teams can only be randomized while tournament is in Draft.",
      );
    }

    const playerMap = new Map(t.session.players.map((p) => [p.id, p]));
    const selected = input.playerIds.map((pid) => {
      const p = playerMap.get(pid);
      if (!p) {
        throw new HttpError(
          400,
          "VALIDATION",
          "Selected player does not belong to the linked session.",
        );
      }
      return { id: p.id, tier: (p.tier as PlayerTierLevel | null) ?? null };
    });

    if (input.replaceExisting) {
      await tx.tournamentTeam.deleteMany({ where: { tournamentId } });
    } else {
      const used = new Set<string>();
      for (const team of t.teams) {
        used.add(team.player1Id);
        used.add(team.player2Id);
      }
      if (selected.some((p) => used.has(p.id))) {
        throw new HttpError(
          409,
          "PLAYER_ALREADY_TEAMED",
          "Some selected players are already assigned to an existing team.",
        );
      }
    }

    const pairs = randomizeBalancedPairs(selected);
    const startSeed = input.replaceExisting
      ? 1
      : t.teams.reduce((m, team) => Math.max(m, team.seed), 0) + 1;

    await tx.tournamentTeam.createMany({
      data: pairs.map(([p1, p2], index) => ({
        tournamentId,
        seed: startSeed + index,
        player1Id: p1.id,
        player2Id: p2.id,
      })),
    });

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function reorderTournamentTeams(
  tournamentId: string,
  input: TournamentTeamsReorderInput,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          orderBy: { seed: "asc" },
          include: { player1: true, player2: true },
        },
      },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status !== "DRAFT") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Seeds can only be changed while tournament is in Draft.",
      );
    }
    if (t.teams.length === 0) {
      throw new HttpError(400, "VALIDATION", "No teams to reorder.");
    }

    let orderedIds: string[];
    if (input.action === "reorder") {
      const currentIds = new Set(t.teams.map((team) => team.id));
      if (
        input.teamIds.length !== currentIds.size ||
        new Set(input.teamIds).size !== currentIds.size ||
        input.teamIds.some((id) => !currentIds.has(id))
      ) {
        throw new HttpError(
          400,
          "VALIDATION",
          "Reorder list must include all tournament teams.",
        );
      }
      orderedIds = input.teamIds;
    } else if (input.action === "shuffle") {
      orderedIds = shuffleArray(t.teams.map((team) => team.id));
    } else {
      orderedIds = seedTeamsByTier(
        t.teams.map((team) => ({
          id: team.id,
          tier1: team.player1.tier,
          tier2: team.player2.tier,
        })),
      ).map((team) => team.id);
    }

    // Offset seeds temporarily to avoid (tournamentId, seed) unique collisions
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.tournamentTeam.update({
        where: { id: orderedIds[i] },
        data: { seed: 10_000 + i + 1 },
      });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.tournamentTeam.update({
        where: { id: orderedIds[i] },
        data: { seed: i + 1 },
      });
    }

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function removeTournamentTeam(
  tournamentId: string,
  teamId: string,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: { orderBy: { seed: "asc" } } },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status !== "DRAFT") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Teams can only be removed while tournament is in Draft.",
      );
    }

    const target = t.teams.find((team) => team.id === teamId);
    if (!target) {
      throw new HttpError(404, "NOT_FOUND", "Team not found in this tournament.");
    }

    await tx.tournamentTeam.delete({ where: { id: teamId } });

    const remaining = t.teams.filter((team) => team.id !== teamId);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].seed !== i + 1) {
        await tx.tournamentTeam.update({
          where: { id: remaining[i].id },
          data: { seed: i + 1 },
        });
      }
    }

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function startTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: { orderBy: { seed: "asc" } } },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status !== "DRAFT") {
      throw new HttpError(409, "INVALID_STATE", "Tournament has already started.");
    }
    if (t.teams.length < 2) {
      throw new HttpError(
        400,
        "VALIDATION",
        "Add at least 2 teams before starting the tournament.",
      );
    }

    const generated = generateSingleEliminationBracket(
      t.teams.map((team) => ({ id: team.id, seed: team.seed })),
      t.hasThirdPlace,
    );

    const keyToId = new Map<string, string>();
    for (const m of generated) {
      const created = await tx.tournamentMatch.create({
        data: {
          tournamentId,
          section: m.section,
          round: m.round,
          slot: m.slot,
          label: m.label,
          status: m.status,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerTeamId: m.winnerTeamId,
        },
      });
      keyToId.set(m.key, created.id);
    }

    for (const m of generated) {
      if (m.nextMatchKey || m.loserNextMatchKey) {
        await tx.tournamentMatch.update({
          where: { id: keyToId.get(m.key)! },
          data: {
            nextMatchId: m.nextMatchKey ? keyToId.get(m.nextMatchKey)! : null,
            nextMatchSlot: m.nextMatchSlot,
            loserNextMatchId: m.loserNextMatchKey
              ? keyToId.get(m.loserNextMatchKey)!
              : null,
            loserNextSlot: m.loserNextSlot,
          },
        });
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS" },
    });

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function resetTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { matches: true },
    });
    if (!t) {
      throw new HttpError(404, "NOT_FOUND", "Tournament not found.");
    }
    if (t.status === "DRAFT") {
      throw new HttpError(409, "INVALID_STATE", "Tournament is already in Draft.");
    }

    const hasActivity = t.matches.some(
      (m) => m.status === "IN_PROGRESS" || m.status === "COMPLETED",
    );
    if (hasActivity) {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Cannot reset bracket after matches have started or completed.",
      );
    }

    await tx.tournamentMatch.deleteMany({ where: { tournamentId } });
    await tx.tournamentTeam.updateMany({
      where: { tournamentId },
      data: { status: "ACTIVE", eliminatedAt: null },
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "DRAFT" },
    });

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function assignTournamentMatch(
  tournamentId: string,
  matchId: string,
  input: TournamentMatchAssignInput,
): Promise<TournamentDetail> {
  const run = () =>
    prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({
        where: { id: matchId },
        include: {
          teamA: true,
          teamB: true,
          tournament: {
            include: {
              session: {
                include: {
                  players: true,
                  games: { include: { players: true } },
                },
              },
            },
          },
        },
      });
      if (!match || match.tournamentId !== tournamentId) {
        throw new HttpError(404, "NOT_FOUND", "Tournament match not found.");
      }
      if (match.status !== "READY" || !match.teamA || !match.teamB) {
        throw new HttpError(
          409,
          "INVALID_STATE",
          "Only READY matches with both teams can be assigned to a court.",
        );
      }
      if (match.gameId) {
        throw new HttpError(
          409,
          "INVALID_STATE",
          "This match is already assigned to the session.",
        );
      }

      const session = match.tournament.session;
      const rosterMap = new Map(session.players.map((p) => [p.id, p.name]));
      const flatIds = [
        match.teamA.player1Id,
        match.teamA.player2Id,
        match.teamB.player1Id,
        match.teamB.player2Id,
      ];
      const maxSeq = session.games.reduce((m, g) => Math.max(m, g.seq), 0);
      const seq = maxSeq + 1;

      const teamRows = [
        { playerId: match.teamA.player1Id, team: "A" as const },
        { playerId: match.teamA.player2Id, team: "A" as const },
        { playerId: match.teamB.player1Id, team: "B" as const },
        { playerId: match.teamB.player2Id, team: "B" as const },
      ];

      let createdGameId: string;

      if (input.type === "court") {
        if (input.courtNumber > session.courtCount) {
          throw new HttpError(
            400,
            "VALIDATION",
            `Court ${input.courtNumber} does not exist in this session.`,
          );
        }
        const occupied = session.games.find(
          (g) => g.status === "ON_COURT" && g.courtNumber === input.courtNumber,
        );
        if (occupied) {
          throw new HttpError(
            409,
            "COURT_OCCUPIED",
            `Court ${input.courtNumber} already has a match in progress.`,
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
            sessionId: session.id,
            seq,
            status: "ON_COURT",
            courtNumber: input.courtNumber,
            locked: true,
            startedAt: new Date(),
            players: { create: teamRows },
          },
        });
        createdGameId = created.id;
      } else {
        const maxQueue = session.games
          .filter((g) => g.status === "QUEUED")
          .reduce((m, g) => Math.max(m, g.queueOrder ?? 0), 0);

        const created = await tx.game.create({
          data: {
            sessionId: session.id,
            seq,
            status: "QUEUED",
            queueOrder: maxQueue + 1,
            locked: true,
            players: { create: teamRows },
          },
        });
        createdGameId = created.id;
      }

      await tx.tournamentMatch.update({
        where: { id: match.id },
        data: { status: "IN_PROGRESS", gameId: createdGameId },
      });

      const full = await tx.tournament.findUniqueOrThrow({
        where: { id: tournamentId },
        include: tournamentDetailInclude,
      });
      return toTournamentDetailDTO(full, true);
    }, TX_OPTIONS);

  try {
    return await run();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return await run();
    }
    throw err;
  }
}

export async function walkoverTournamentMatch(
  tournamentId: string,
  matchId: string,
  winnerSide: "A" | "B",
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.tournamentMatch.findUnique({
      where: { id: matchId },
    });
    if (!match || match.tournamentId !== tournamentId) {
      throw new HttpError(404, "NOT_FOUND", "Tournament match not found.");
    }
    if (match.status !== "READY") {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Walkover can only be awarded to a READY match.",
      );
    }

    await tx.tournamentMatch.update({
      where: { id: match.id },
      data: { isWalkover: true },
    });

    await advanceTournamentMatch(tx, match.id, winnerSide);

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}

export async function undoTournamentMatch(
  tournamentId: string,
  matchId: string,
): Promise<TournamentDetail> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.tournamentMatch.findUnique({
      where: { id: matchId },
    });
    if (!match || match.tournamentId !== tournamentId) {
      throw new HttpError(404, "NOT_FOUND", "Tournament match not found.");
    }
    if (match.status !== "COMPLETED" || !match.winnerTeamId) {
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Only completed matches can be undone.",
      );
    }

    const loserTeamId =
      match.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;

    // Ensure downstream matches haven't started yet
    if (match.nextMatchId && match.nextMatchSlot) {
      const next = await tx.tournamentMatch.findUniqueOrThrow({
        where: { id: match.nextMatchId },
      });
      if (
        next.status === "IN_PROGRESS" ||
        next.status === "COMPLETED" ||
        next.gameId !== null
      ) {
        throw new HttpError(
          409,
          "INVALID_STATE",
          "Cannot undo: the next bracket match has already started or finished.",
        );
      }
      await tx.tournamentMatch.update({
        where: { id: next.id },
        data: {
          ...(match.nextMatchSlot === "A"
            ? { teamAId: null }
            : { teamBId: null }),
          status: "PENDING",
        },
      });
    } else if (match.section === "MAIN") {
      await tx.tournamentTeam.update({
        where: { id: match.winnerTeamId },
        data: { status: "ACTIVE" },
      });
    }

    if (match.loserNextMatchId && match.loserNextSlot) {
      const loserNext = await tx.tournamentMatch.findUniqueOrThrow({
        where: { id: match.loserNextMatchId },
      });
      if (
        loserNext.status === "IN_PROGRESS" ||
        loserNext.status === "COMPLETED" ||
        loserNext.gameId !== null
      ) {
        throw new HttpError(
          409,
          "INVALID_STATE",
          "Cannot undo: the 3rd-place match has already started or finished.",
        );
      }
      await tx.tournamentMatch.update({
        where: { id: loserNext.id },
        data: {
          ...(match.loserNextSlot === "A"
            ? { teamAId: null }
            : { teamBId: null }),
          status: "PENDING",
        },
      });
    } else if (loserTeamId) {
      await tx.tournamentTeam.update({
        where: { id: loserTeamId },
        data: { status: "ACTIVE", eliminatedAt: null },
      });
    }

    const oldGameId = match.gameId;
    await tx.tournamentMatch.update({
      where: { id: match.id },
      data: {
        status: "READY",
        winnerTeamId: null,
        isWalkover: false,
        gameId: null,
      },
    });

    if (oldGameId) {
      await tx.game.delete({ where: { id: oldGameId } });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS" },
    });

    const full = await tx.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: tournamentDetailInclude,
    });
    return toTournamentDetailDTO(full, true);
  }, TX_OPTIONS);
}
