import { useSyncExternalStore } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { todayISO } from "./format";
import { queryClient, queryKeys } from "./query";
import type {
  AdminCreateInput,
  AdminPasswordInput,
  AssignInput,
  SessionInput,
  SessionPatchInput,
  TreasuryInput,
  TreasuryPatchInput,
} from "./schemas";
import type {
  AdminUser,
  Game,
  Session,
  SessionSummary,
  SessionsFilterParams,
  SessionsPage,
  Team,
  TreasuryEntry,
  TreasuryFilterParams,
  TreasurySummary,
} from "./types";

export { todayISO };

const CURRENT_KEY = "mbg-current-v2";
const currentListeners = new Set<() => void>();

function subscribeCurrent(cb: () => void) {
  currentListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CURRENT_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    currentListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getCurrentSnapshot = () => localStorage.getItem(CURRENT_KEY) ?? "";
const getServerCurrentSnapshot = () => "";

export function useCurrentSessionId(): string | null {
  const val = useSyncExternalStore(
    subscribeCurrent,
    getCurrentSnapshot,
    getServerCurrentSnapshot,
  );
  return val || null;
}

export function selectSession(id: string | null) {
  if (id) {
    localStorage.setItem(CURRENT_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
  currentListeners.forEach((cb) => cb());
}

const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** One player per line. Strips "1.", "2)", "- ", "• " prefixes and removes duplicates. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const name = line
      .trim()
      .replace(/^\s*(?:\d+\s*[.)\-:]\s*|[-*•]\s*)/, "")
      .trim();
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

/* ---------------------------------- queries --------------------------------- */

export function useSessionsList(
  params?: SessionsFilterParams,
  pollMs = 10_000,
) {
  const query = useQuery({
    queryKey: queryKeys.sessionsPage(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      if (params?.status && params.status !== "ALL") {
        sp.set("status", params.status);
      }
      if (params?.q?.trim()) sp.set("q", params.q.trim());
      if (params?.page && params.page > 1) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      const qs = sp.toString();
      return api<SessionsPage>(qs ? `/sessions?${qs}` : "/sessions");
    },
    placeholderData: keepPreviousData,
    refetchInterval: pollMs,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    error: query.error,
    loading: query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useSessionSummary(sessionId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.sessionSummary(sessionId ?? ""),
    queryFn: async () => {
      const { summary } = await api<{ summary: SessionSummary }>(
        `/sessions/${sessionId}/summary`,
      );
      return summary;
    },
    enabled: Boolean(sessionId),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    error: query.error,
    loading: Boolean(sessionId) && query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useSessionDetail(sessionId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.sessionDetail(sessionId ?? ""),
    queryFn: async () => {
      const { session } = await api<{ session: Session }>(`/sessions/${sessionId}`);
      return session;
    },
    enabled: Boolean(sessionId),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    error: query.error,
    loading: Boolean(sessionId) && query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useTreasury(params?: TreasuryFilterParams) {
  const query = useQuery({
    queryKey: queryKeys.treasurySummary(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      if (params?.type && params.type !== "ALL") sp.set("type", params.type);
      if (params?.q?.trim()) sp.set("q", params.q.trim());
      if (params?.page && params.page > 1) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      const qs = sp.toString();
      return api<TreasurySummary>(qs ? `/treasury?${qs}` : "/treasury");
    },
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    error: query.error,
    loading: query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useAdmins() {
  const query = useQuery({
    queryKey: queryKeys.admins,
    queryFn: async () => {
      const { admins } = await api<{ admins: AdminUser[] }>("/admins");
      return admins;
    },
  });

  return {
    data: query.data,
    error: query.error,
    loading: query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

/* ------------------------------ session actions ----------------------------- */

export async function createSession(input: SessionInput): Promise<Session> {
  const { session } = await api<{ session: Session }>("/sessions", {
    method: "POST",
    body: input,
  });
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(session.id), session);
  selectSession(session.id);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(session.id),
  });
  return session;
}

export async function updateSession(
  id: string,
  input: SessionPatchInput,
): Promise<Session> {
  const { session } = await api<{ session: Session }>(`/sessions/${id}`, {
    method: "PATCH",
    body: input,
  });
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(id), session);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSummary(id) });
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" });
  queryClient.removeQueries({ queryKey: queryKeys.sessionDetail(id) });
  queryClient.removeQueries({ queryKey: queryKeys.sessionSummary(id) });
  if (localStorage.getItem(CURRENT_KEY) === id) {
    selectSession(null);
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
}

export async function setRoster(
  sessionId: string,
  names: string[],
): Promise<Session> {
  const { session } = await api<{ session: Session }>(
    `/sessions/${sessionId}/players`,
    {
      method: "PUT",
      body: { names },
    },
  );
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(sessionId), session);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(sessionId),
  });
  return session;
}

/* ------------------------------- match actions ------------------------------ */

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

/* ----------------------------- treasury actions ----------------------------- */

export async function addTreasuryEntry(
  input: TreasuryInput,
): Promise<TreasuryEntry> {
  const { entry } = await api<{ entry: TreasuryEntry }>("/treasury/entries", {
    method: "POST",
    body: input,
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return entry;
}

export async function editTreasuryEntry(
  id: string,
  input: TreasuryPatchInput,
): Promise<TreasuryEntry> {
  const { entry } = await api<{ entry: TreasuryEntry }>(
    `/treasury/entries/${id}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return entry;
}

export async function removeTreasuryEntry(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/treasury/entries/${id}`, { method: "DELETE" });
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
}

/* ------------------------------- admin actions ------------------------------ */

export async function createAdmin(input: AdminCreateInput): Promise<AdminUser> {
  const { admin } = await api<{ admin: AdminUser }>("/admins", {
    method: "POST",
    body: input,
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.admins });
  return admin;
}

export async function deleteAdmin(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/admins/${id}`, { method: "DELETE" });
  await queryClient.invalidateQueries({ queryKey: queryKeys.admins });
}

export async function resetAdminPassword(
  id: string,
  input: AdminPasswordInput,
): Promise<void> {
  await api<{ ok: boolean }>(`/admins/${id}/password`, {
    method: "PUT",
    body: input,
  });
}
