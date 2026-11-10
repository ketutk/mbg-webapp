import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateSession, sessionKeys } from "@/features/sessions";
import {
  deleteClearAllGames,
  deleteGameRecord,
  patchGamePlayers,
  postAssignGame,
  postFinishGame,
  postStartQueuedGame,
  putGameLock,
  putReorderQueue,
  putTickPlayed,
} from "./api";
import type { AssignInput } from "./schemas";
import type { Game, Team } from "./types";
import type { Session } from "@/features/sessions";

export function useAssignMatch(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignInput) => postAssignGame(sessionId, input),
    meta: { success: "Match assigned", error: "Could not assign match" },
    onSuccess: (game) => {
      qc.setQueryData<Session>(sessionKeys.detail(sessionId), (prev) =>
        prev ? { ...prev, games: [...prev.games, game] } : prev,
      );
      void invalidateSession(qc, sessionId);
    },
  });
}

export function useUpdateMatchPlayers(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, teams }: { gameId: string; teams: [Team, Team] }) =>
      patchGamePlayers(gameId, teams),
    meta: { success: "Match players updated", error: "Could not update match" },
    onSuccess: (game) => {
      qc.setQueryData<Session>(sessionKeys.detail(sessionId), (prev) =>
        prev
          ? { ...prev, games: prev.games.map((g) => (g.id === game.id ? game : g)) }
          : prev,
      );
      void invalidateSession(qc, sessionId);
    },
  });
}

export function useStartQueuedMatch(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gameId,
      courtNumber,
    }: {
      gameId: string;
      courtNumber: number;
    }) => postStartQueuedGame(gameId, courtNumber),
    meta: {
      success: "Queued match started",
      error: "Could not start queued match",
    },
    onMutate: async ({ gameId, courtNumber }) => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      if (prev) {
        qc.setQueryData<Session>(sessionKeys.detail(sessionId), {
          ...prev,
          games: prev.games.map((g) =>
            g.id === gameId
              ? {
                  ...g,
                  status: "ON_COURT",
                  courtNumber,
                  queueOrder: undefined,
                  startedAt: Date.now(),
                }
              : g,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev);
    },
    onSettled: () => invalidateSession(qc, sessionId),
  });
}

export function useFinishMatch(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => postFinishGame(gameId),
    meta: { success: "Match finished", error: "Could not finish match" },
    onMutate: async (gameId) => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      if (prev) {
        qc.setQueryData<Session>(sessionKeys.detail(sessionId), {
          ...prev,
          games: prev.games.map((g) =>
            g.id === gameId
              ? { ...g, status: "DONE", courtNumber: undefined }
              : g,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev);
    },
    onSettled: () => invalidateSession(qc, sessionId),
  });
}

export function useReorderQueue(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameIds: string[]) => putReorderQueue(sessionId, gameIds),
    meta: { error: "Could not reorder queue" },
    onMutate: async (gameIds) => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      if (prev) {
        const orderMap = new Map(gameIds.map((id, idx) => [id, idx + 1]));
        qc.setQueryData<Session>(sessionKeys.detail(sessionId), {
          ...prev,
          games: prev.games.map((g) =>
            orderMap.has(g.id) ? { ...g, queueOrder: orderMap.get(g.id) } : g,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev);
    },
    onSettled: () => invalidateSession(qc, sessionId),
  });
}

export function useRemoveGame(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => deleteGameRecord(gameId),
    meta: { success: "Game removed", error: "Could not remove game" },
    onMutate: async (gameId) => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      if (prev) {
        qc.setQueryData<Session>(sessionKeys.detail(sessionId), {
          ...prev,
          games: prev.games.filter((g) => g.id !== gameId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev);
    },
    onSettled: () => invalidateSession(qc, sessionId),
  });
}

export function useClearAllGames(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteClearAllGames(sessionId),
    meta: { success: "All games cleared", error: "Could not clear games" },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      if (prev) {
        qc.setQueryData<Session>(sessionKeys.detail(sessionId), {
          ...prev,
          games: [],
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev);
    },
    onSettled: () => invalidateSession(qc, sessionId),
  });
}

// Standalone actions for backward compatibility
export async function assignMatch(
  sessionId: string,
  input: AssignInput,
): Promise<Game> {
  return postAssignGame(sessionId, input);
}

export async function updateMatchPlayers(
  sessionId: string,
  gameId: string,
  teams: [Team, Team],
): Promise<Game> {
  return patchGamePlayers(gameId, teams);
}

export async function startQueuedMatch(
  sessionId: string,
  gameId: string,
  courtNumber: number,
): Promise<Game> {
  return postStartQueuedGame(gameId, courtNumber);
}

export async function finishMatch(
  sessionId: string,
  gameId: string,
): Promise<Game> {
  return postFinishGame(gameId);
}

export async function reorderQueue(
  sessionId: string,
  gameIds: string[],
): Promise<void> {
  await putReorderQueue(sessionId, gameIds);
}

export async function removeGame(
  sessionId: string,
  gameId: string,
): Promise<void> {
  await deleteGameRecord(gameId);
}

export async function clearGames(sessionId: string): Promise<void> {
  await deleteClearAllGames(sessionId);
}

export async function setPlayed(
  sessionId: string,
  gameId: string,
  playerId: string,
  checked: boolean,
): Promise<Game> {
  return putTickPlayed(gameId, playerId, checked);
}

export async function setGameLocked(
  sessionId: string,
  gameId: string,
  locked: boolean,
): Promise<Game> {
  return putGameLock(gameId, locked);
}
