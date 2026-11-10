import { api } from "@/lib/api";
import type { AssignInput } from "./schemas";
import type { Game, Team } from "./types";

export async function postAssignGame(
  sessionId: string,
  input: AssignInput,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/sessions/${sessionId}/games`, {
    method: "POST",
    body: input,
  });
  return game;
}

export async function patchGamePlayers(
  gameId: string,
  teams: [Team, Team],
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}`, {
    method: "PATCH",
    body: { teams },
  });
  return game;
}

export async function postStartQueuedGame(
  gameId: string,
  courtNumber: number,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}/start`, {
    method: "POST",
    body: { courtNumber },
  });
  return game;
}

export async function postFinishGame(gameId: string): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}/finish`, {
    method: "POST",
  });
  return game;
}

export async function putReorderQueue(
  sessionId: string,
  gameIds: string[],
): Promise<void> {
  await api(`/sessions/${sessionId}/queue`, {
    method: "PUT",
    body: { gameIds },
  });
}

export async function deleteGameRecord(gameId: string): Promise<void> {
  await api(`/games/${gameId}`, { method: "DELETE" });
}

export async function deleteClearAllGames(sessionId: string): Promise<void> {
  await api(`/sessions/${sessionId}/games`, { method: "DELETE" });
}

export async function putTickPlayed(
  gameId: string,
  playerId: string,
  checked: boolean,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(
    `/games/${gameId}/players/${playerId}`,
    {
      method: "PUT",
      body: { checked },
    },
  );
  return game;
}

export async function putGameLock(
  gameId: string,
  locked: boolean,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}/lock`, {
    method: "PUT",
    body: { locked },
  });
  return game;
}
