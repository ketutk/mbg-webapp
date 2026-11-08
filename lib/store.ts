import { useSyncExternalStore } from "react";
import { api } from "./api";
import { todayISO } from "./format";
import { getQueryData, invalidate, setQueryData, useQuery } from "./query";
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
  SessionListItem,
  SessionSummary,
  Team,
  TreasuryEntry,
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

export function useSessionsList(pollMs = 10_000) {
  return useQuery(
    "sessions:list",
    async () => {
      const { sessions } = await api<{ sessions: SessionListItem[] }>("/sessions");
      return sessions;
    },
    { pollMs },
  );
}

export function useSessionSummary(sessionId: string | null) {
  return useQuery(
    sessionId ? `session:summary:${sessionId}` : null,
    async () => {
      const { summary } = await api<{ summary: SessionSummary }>(
        `/sessions/${sessionId}/summary`,
      );
      return summary;
    },
    { pollMs: 10_000 },
  );
}

export function useSessionDetail(sessionId: string | null) {
  return useQuery(
    sessionId ? `session:detail:${sessionId}` : null,
    async () => {
      const { session } = await api<{ session: Session }>(`/sessions/${sessionId}`);
      return session;
    },
    { pollMs: 5_000 },
  );
}

export function useTreasury() {
  return useQuery("treasury:summary", () => api<TreasurySummary>("/treasury"));
}

export function useAdmins() {
  return useQuery("admins:list", async () => {
    const { admins } = await api<{ admins: AdminUser[] }>("/admins");
    return admins;
  });
}

/* ------------------------------ session actions ----------------------------- */

export async function createSession(input: SessionInput): Promise<Session> {
  const { session } = await api<{ session: Session }>("/sessions", {
    method: "POST",
    body: input,
  });
  setQueryData<Session>(`session:detail:${session.id}`, () => session);
  selectSession(session.id);
  invalidate("sessions:list");
  invalidate(`session:summary:${session.id}`);
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
  setQueryData<Session>(`session:detail:${id}`, () => session);
  invalidate("sessions:list");
  invalidate(`session:summary:${id}`);
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" });
  const list = getQueryData<SessionListItem[]>("sessions:list") ?? [];
  const next = list.filter((s) => s.id !== id);
  setQueryData<SessionListItem[]>("sessions:list", () => next);
  if (localStorage.getItem(CURRENT_KEY) === id) {
    selectSession(next[0]?.id ?? null);
  }
  invalidate("sessions:list");
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
  setQueryData<Session>(`session:detail:${sessionId}`, () => session);
  invalidate(`session:summary:${sessionId}`);
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
  setQueryData<Session>(`session:detail:${sessionId}`, (prev) =>
    prev ? { ...prev, games: [...prev.games, game] } : prev,
  );
  invalidate(`session:detail:${sessionId}`);
  invalidate(`session:summary:${sessionId}`);
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
  setQueryData<Session>(`session:detail:${sessionId}`, (prev) =>
    prev
      ? { ...prev, games: prev.games.map((g) => (g.id === gameId ? game : g)) }
      : prev,
  );
  invalidate(`session:detail:${sessionId}`);
  invalidate(`session:summary:${sessionId}`);
  return game;
}

export async function startQueuedMatch(
  sessionId: string,
  gameId: string,
  courtNumber: number,
): Promise<Game> {
  const { game } = await api<{ game: Game }>(`/games/${gameId}/start`, {
    method: "POST",
    body: { courtNumber },
  });
  setQueryData<Session>(`session:detail:${sessionId}`, (prev) =>
    prev
      ? { ...prev, games: prev.games.map((g) => (g.id === gameId ? game : g)) }
      : prev,
  );
  invalidate(`session:detail:${sessionId}`);
  invalidate(`session:summary:${sessionId}`);
  return game;
}

export async function finishMatch(
  sessionId: string,
  gameId: string,
): Promise<Game> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
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
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    invalidate(`session:summary:${sessionId}`);
    return game;
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    invalidate(`session:detail:${sessionId}`);
    throw err;
  }
}

export async function reorderQueue(
  sessionId: string,
  gameIds: string[],
): Promise<Session> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    const orderMap = new Map(gameIds.map((id, idx) => [id, idx + 1]));
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
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
    setQueryData<Session>(`session:detail:${sessionId}`, () => session);
    invalidate(`session:summary:${sessionId}`);
    return session;
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    invalidate(`session:detail:${sessionId}`);
    throw err;
  }
}

export async function removeGame(
  sessionId: string,
  gameId: string,
): Promise<void> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
      s ? { ...s, games: s.games.filter((g) => g.id !== gameId) } : s,
    );
  }
  try {
    await api<{ ok: boolean }>(`/games/${gameId}`, { method: "DELETE" });
    invalidate(`session:detail:${sessionId}`);
    invalidate(`session:summary:${sessionId}`);
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    throw err;
  }
}

export async function clearGames(sessionId: string): Promise<void> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
      s ? { ...s, games: [] } : s,
    );
  }
  try {
    await api<{ ok: boolean }>(`/sessions/${sessionId}/games`, {
      method: "DELETE",
    });
    invalidate(`session:summary:${sessionId}`);
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    throw err;
  }
}

export async function setPlayed(
  sessionId: string,
  gameId: string,
  playerId: string,
  checked: boolean,
): Promise<Game> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    setQueryData<Session>(`session:detail:${sessionId}`, (s) => {
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
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    invalidate(`session:summary:${sessionId}`);
    return game;
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    invalidate(`session:detail:${sessionId}`);
    throw err;
  }
}

export async function setGameLocked(
  sessionId: string,
  gameId: string,
  locked: boolean,
): Promise<Game> {
  const prevSession = getQueryData<Session>(`session:detail:${sessionId}`);
  if (prevSession) {
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
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
    setQueryData<Session>(`session:detail:${sessionId}`, (s) =>
      s ? { ...s, games: s.games.map((g) => (g.id === gameId ? game : g)) } : s,
    );
    return game;
  } catch (err) {
    if (prevSession) {
      setQueryData<Session>(`session:detail:${sessionId}`, () => prevSession);
    }
    invalidate(`session:detail:${sessionId}`);
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
  invalidate("treasury:summary");
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
  invalidate("treasury:summary");
  return entry;
}

export async function removeTreasuryEntry(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/treasury/entries/${id}`, { method: "DELETE" });
  invalidate("treasury:summary");
}

/* ------------------------------- admin actions ------------------------------ */

export async function createAdmin(input: AdminCreateInput): Promise<AdminUser> {
  const { admin } = await api<{ admin: AdminUser }>("/admins", {
    method: "POST",
    body: input,
  });
  invalidate("admins:list");
  return admin;
}

export async function deleteAdmin(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/admins/${id}`, { method: "DELETE" });
  invalidate("admins:list");
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
