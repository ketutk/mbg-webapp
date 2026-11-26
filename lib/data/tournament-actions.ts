import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type {
  TournamentCreateInput,
  TournamentMatchAssignInput,
  TournamentMatchSwapInput,
  TournamentPatchInput,
  TournamentRandomizeInput,
  TournamentTeamAddInput,
  TournamentTeamPatchInput,
  TournamentTeamsReorderInput,
} from "../schemas";
import type { TournamentDetail } from "../types";

function syncTournamentCaches(
  tournament: TournamentDetail,
  opts: { touchesSession?: boolean } = {},
) {
  queryClient.setQueryData<TournamentDetail>(
    queryKeys.tournamentDetail(tournament.id),
    tournament,
  );
  // Only invalidate list queries, NEVER the detail key we just updated
  void queryClient.invalidateQueries({
    queryKey: queryKeys.tournamentsListPrefix,
  });
  if (opts.touchesSession) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionDetail(tournament.session.id),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(tournament.session.id),
    });
  }
}

export async function createTournament(
  input: TournamentCreateInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    "/tournaments",
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  return tournament;
}

export async function updateTournament(
  id: string,
  input: TournamentPatchInput,
): Promise<TournamentDetail> {
  const key = queryKeys.tournamentDetail(id);
  const prev = queryClient.getQueryData<TournamentDetail>(key);
  if (prev) {
    queryClient.setQueryData<TournamentDetail>(key, {
      ...prev,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.hasThirdPlace !== undefined
        ? { hasThirdPlace: input.hasThirdPlace }
        : {}),
      ...(input.preferredCourts !== undefined
        ? { preferredCourts: input.preferredCourts }
        : {}),
    });
  }

  try {
    const { tournament } = await api<{ tournament: TournamentDetail }>(
      `/tournaments/${id}`,
      { method: "PATCH", body: input },
    );
    syncTournamentCaches(tournament);
    return tournament;
  } catch (err) {
    if (prev) queryClient.setQueryData<TournamentDetail>(key, prev);
    throw err;
  }
}

export async function deleteTournament(
  id: string,
  sessionId?: string,
): Promise<void> {
  await api<{ ok: boolean }>(`/tournaments/${id}`, { method: "DELETE" });
  queryClient.removeQueries({ queryKey: queryKeys.tournamentDetail(id) });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.tournamentsListPrefix,
  });
  if (sessionId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionDetail(sessionId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
  }
}

export async function addTournamentTeam(
  tournamentId: string,
  input: TournamentTeamAddInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/teams`,
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function updateTournamentTeam(
  tournamentId: string,
  teamId: string,
  input: TournamentTeamPatchInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/teams/${teamId}`,
    { method: "PATCH", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function randomizeTournamentTeams(
  tournamentId: string,
  input: TournamentRandomizeInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/teams/randomize`,
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function reorderTournamentTeams(
  tournamentId: string,
  input: TournamentTeamsReorderInput,
): Promise<TournamentDetail> {
  const key = queryKeys.tournamentDetail(tournamentId);
  const prev = queryClient.getQueryData<TournamentDetail>(key);

  if (prev && input.action === "reorder") {
    const teamMap = new Map(prev.teams.map((t) => [t.id, t]));
    const nextTeams = input.teamIds
      .map((id, idx) => {
        const t = teamMap.get(id);
        return t ? { ...t, seed: idx + 1 } : null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
    if (nextTeams.length === prev.teams.length) {
      queryClient.setQueryData<TournamentDetail>(key, {
        ...prev,
        teams: nextTeams,
      });
    }
  }

  try {
    const { tournament } = await api<{ tournament: TournamentDetail }>(
      `/tournaments/${tournamentId}/teams`,
      { method: "PATCH", body: input },
    );
    syncTournamentCaches(tournament);
    return tournament;
  } catch (err) {
    if (prev) queryClient.setQueryData<TournamentDetail>(key, prev);
    throw err;
  }
}

export async function removeTournamentTeam(
  tournamentId: string,
  teamId: string,
): Promise<TournamentDetail> {
  const key = queryKeys.tournamentDetail(tournamentId);
  const prev = queryClient.getQueryData<TournamentDetail>(key);

  if (prev) {
    const nextTeams = prev.teams
      .filter((t) => t.id !== teamId)
      .map((t, idx) => ({ ...t, seed: idx + 1 }));
    queryClient.setQueryData<TournamentDetail>(key, {
      ...prev,
      teams: nextTeams,
    });
  }

  try {
    const { tournament } = await api<{ tournament: TournamentDetail }>(
      `/tournaments/${tournamentId}/teams/${teamId}`,
      { method: "DELETE" },
    );
    syncTournamentCaches(tournament);
    return tournament;
  } catch (err) {
    if (prev) queryClient.setQueryData<TournamentDetail>(key, prev);
    throw err;
  }
}

export async function startTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/start`,
    { method: "POST" },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  return tournament;
}

export async function resetTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/reset`,
    { method: "POST" },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  return tournament;
}

export async function assignTournamentMatch(
  tournamentId: string,
  matchId: string,
  input: TournamentMatchAssignInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/matches/${matchId}/assign`,
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  return tournament;
}

export async function walkoverTournamentMatch(
  tournamentId: string,
  matchId: string,
  winnerSide: "A" | "B",
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/matches/${matchId}/walkover`,
    { method: "POST", body: { winnerSide } },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  return tournament;
}

export async function undoTournamentMatch(
  tournamentId: string,
  matchId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/matches/${matchId}/undo`,
    { method: "POST" },
  );
  syncTournamentCaches(tournament, { touchesSession: true });
  return tournament;
}

export async function updateTournamentMatchOrder(
  tournamentId: string,
  matchIds: string[],
): Promise<TournamentDetail> {
  const key = queryKeys.tournamentDetail(tournamentId);
  const prev = queryClient.getQueryData<TournamentDetail>(key);

  if (prev) {
    const orderMap = new Map(matchIds.map((id, idx) => [id, idx + 1]));
    queryClient.setQueryData<TournamentDetail>(key, {
      ...prev,
      matches: prev.matches.map((m) =>
        orderMap.has(m.id) ? { ...m, playOrder: orderMap.get(m.id)! } : m,
      ),
    });
  }

  try {
    const { tournament } = await api<{ tournament: TournamentDetail }>(
      `/tournaments/${tournamentId}/matches/order`,
      { method: "PATCH", body: { matchIds } },
    );
    syncTournamentCaches(tournament);
    return tournament;
  } catch (err) {
    if (prev) queryClient.setQueryData<TournamentDetail>(key, prev);
    throw err;
  }
}

export async function swapTournamentMatchSlots(
  tournamentId: string,
  input: TournamentMatchSwapInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/matches/swap`,
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}
