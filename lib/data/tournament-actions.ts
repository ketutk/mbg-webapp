import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type {
  TournamentCreateInput,
  TournamentMatchAssignInput,
  TournamentPatchInput,
  TournamentRandomizeInput,
  TournamentTeamAddInput,
  TournamentTeamsReorderInput,
} from "../schemas";
import type { TournamentDetail } from "../types";

function syncTournamentCaches(tournament: TournamentDetail) {
  queryClient.setQueryData<TournamentDetail>(
    queryKeys.tournamentDetail(tournament.id),
    tournament,
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionDetail(tournament.session.id),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(tournament.session.id),
  });
}

export async function createTournament(
  input: TournamentCreateInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    "/tournaments",
    { method: "POST", body: input },
  );
  syncTournamentCaches(tournament);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  return tournament;
}

export async function updateTournament(
  id: string,
  input: TournamentPatchInput,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${id}`,
    { method: "PATCH", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function deleteTournament(
  id: string,
  sessionId?: string,
): Promise<void> {
  await api<{ ok: boolean }>(`/tournaments/${id}`, { method: "DELETE" });
  queryClient.removeQueries({ queryKey: queryKeys.tournamentDetail(id) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
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
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/teams`,
    { method: "PATCH", body: input },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function removeTournamentTeam(
  tournamentId: string,
  teamId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/teams/${teamId}`,
    { method: "DELETE" },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function startTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/start`,
    { method: "POST" },
  );
  syncTournamentCaches(tournament);
  return tournament;
}

export async function resetTournament(
  tournamentId: string,
): Promise<TournamentDetail> {
  const { tournament } = await api<{ tournament: TournamentDetail }>(
    `/tournaments/${tournamentId}/reset`,
    { method: "POST" },
  );
  syncTournamentCaches(tournament);
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
  syncTournamentCaches(tournament);
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
  syncTournamentCaches(tournament);
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
  syncTournamentCaches(tournament);
  return tournament;
}
