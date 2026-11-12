import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type { AssignInput } from "../schemas";
import type { Game, Session, Team } from "../types";

export async function assignMatch(
  sessionId: string,
  input: AssignInput,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/sessions/${sessionId}/games`, {
    method: "POST",
    body: input,
  });
  queryClient.setQueryData<Session>(
    queryKeys.sessionDetail(sessionId),
    (prev) => (prev ? { ...prev, games: [...prev.games, game] } : prev),
  );
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionDetail(sessionId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(sessionId),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  return game;
}

export async function updateMatchPlayers(
  sessionId: string,
  gameId: string,
  teams: [Team, Team],
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}`, {
    method: "PATCH",
    body: { teams },
  });
  queryClient.setQueryData<Session>(
    queryKeys.sessionDetail(sessionId),
    (prev) =>
      prev
        ? { ...prev, games: prev.games.map((g) => (g.id === gameId ? game : g)) }
        : prev,
  );
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionDetail(sessionId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(sessionId),
  });
  return game;
}

export async function startQueuedMatch(
  sessionId: string,
  gameId: string,
  courtNumber: number,
): Promise<Game> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) =>
      s
        ? {
            ...s,
            games: s.games.map((g) =>
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
          }
        : s,
    );
  }

  try {
    const { game } = await api<{ game: Game }>(`/games/${gameId}/start`, {
      method: "POST",
      body: { courtNumber },
    });
    queryClient.setQueryData<Session>(key, (prev) =>
      prev
        ? { ...prev, games: prev.games.map((g) => (g.id === gameId ? game : g)) }
        : prev,
    );
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    return game;
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    void queryClient.invalidateQueries({ queryKey: key });
    throw err;
  }
}

export async function finishMatch(
  sessionId: string,
  gameId: string,
): Promise<Game> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) =>
      s
        ? {
            ...s,
            games: s.games.map((g) =>
              g.id === gameId
                ? { ...g, status: "DONE", courtNumber: undefined }
                : g,
            ),
          }
        : s,
    );
  }

  try {
    const { game } = await api<{ game: Game }>(`/games/${gameId}/finish`, {
      method: "POST",
    });
    queryClient.setQueryData<Session>(key, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    return game;
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    void queryClient.invalidateQueries({ queryKey: key });
    throw err;
  }
}

export async function reorderQueue(
  sessionId: string,
  gameIds: string[],
): Promise<Session> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    const orderMap = new Map(gameIds.map((id, idx) => [id, idx + 1]));
    queryClient.setQueryData<Session>(key, (s) =>
      s
        ? {
            ...s,
            games: s.games.map((g) =>
              orderMap.has(g.id) ? { ...g, queueOrder: orderMap.get(g.id) } : g,
            ),
          }
        : s,
    );
  }

  try {
    const { session } = await api<{ session: Session }>(
      `/sessions/${sessionId}/queue`,
      {
        method: "PUT",
        body: { gameIds },
      },
    );
    queryClient.setQueryData<Session>(key, session);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    return session;
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    void queryClient.invalidateQueries({ queryKey: key });
    throw err;
  }
}

export async function removeGame(
  sessionId: string,
  gameId: string,
): Promise<void> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) =>
      s ? { ...s, games: s.games.filter((g) => g.id !== gameId) } : s,
    );
  }

  try {
    await api<{ ok: boolean }>(`/games/${gameId}`, { method: "DELETE" });
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    throw err;
  }
}

export async function clearGames(sessionId: string): Promise<void> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) =>
      s ? { ...s, games: [] } : s,
    );
  }

  try {
    await api<{ ok: boolean }>(`/sessions/${sessionId}/games`, {
      method: "DELETE",
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    throw err;
  }
}

export async function setPlayed(
  sessionId: string,
  gameId: string,
  playerId: string,
  checked: boolean,
): Promise<Game> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) => {
      if (!s) return s;
      return {
        ...s,
        games: s.games.map((g) => {
          if (g.id !== gameId) return g;
          const nextIds = checked
            ? g.playerIds.includes(playerId)
              ? g.playerIds
              : [...g.playerIds, playerId]
            : g.playerIds.filter((id) => id !== playerId);
          return {
            ...g,
            playerIds: nextIds,
            teams: undefined,
            locked: nextIds.length === 4,
          };
        }),
      };
    });
  }

  try {
    const { game } = await api<{ game: Game }>(
      `/games/${gameId}/players/${playerId}`,
      {
        method: "PUT",
        body: { checked },
      },
    );
    queryClient.setQueryData<Session>(key, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sessionSummary(sessionId),
    });
    return game;
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    void queryClient.invalidateQueries({ queryKey: key });
    throw err;
  }
}

export async function setGameLocked(
  sessionId: string,
  gameId: string,
  locked: boolean,
): Promise<Game> {
  const key = queryKeys.sessionDetail(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const prevSession = queryClient.getQueryData<Session>(key);

  if (prevSession) {
    queryClient.setQueryData<Session>(key, (s) =>
      s
        ? {
            ...s,
            games: s.games.map((g) =>
              g.id === gameId ? { ...g, locked } : g,
            ),
          }
        : s,
    );
  }

  try {
    const { game } = await api<{ game: Game }>(`/games/${gameId}/lock`, {
      method: "PUT",
      body: { locked },
    });
    queryClient.setQueryData<Session>(key, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    return game;
  } catch (err) {
    if (prevSession) queryClient.setQueryData<Session>(key, prevSession);
    void queryClient.invalidateQueries({ queryKey: key });
    throw err;
  }
}

