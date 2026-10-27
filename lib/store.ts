import { useMemo, useSyncExternalStore } from "react";
import type { DB, Session, Team } from "./types";

/**
 * Tiny localStorage-backed store (same "on this phone" behaviour as the old app).
 * `useSyncExternalStore` keeps SSR/hydration safe: the server renders the empty state
 * and the client swaps in the saved data right after hydration.
 */
const KEY = "mbg-match-v1";
const EMPTY: DB = { sessions: [], currentId: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => localStorage.getItem(KEY) ?? "";
const getServerSnapshot = () => "";

function parse(raw: string): DB {
  if (!raw) return EMPTY;
  try {
    const d = JSON.parse(raw);
    if (Array.isArray(d?.sessions)) {
      return { sessions: d.sessions, currentId: d.currentId ?? null };
    }
  } catch {}
  return EMPTY;
}

export function useDB(): DB {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parse(raw), [raw]);
}

const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function mutate(fn: (db: DB) => DB) {
  localStorage.setItem(KEY, JSON.stringify(fn(parse(getSnapshot()))));
  emit();
}

function patch(db: DB, sessionId: string, fn: (s: Session) => Session): DB {
  return {
    ...db,
    sessions: db.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

/* ---------------------------------- actions --------------------------------- */

export function createSession(input: {
  name: string;
  date: string;
  names: string[];
}): string {
  const id = uid();
  mutate((db) => ({
    currentId: id,
    sessions: [
      ...db.sessions,
      {
        id,
        name: input.name,
        date: input.date,
        players: input.names.map((name) => ({ id: uid(), name })),
        games: [],
      },
    ],
  }));
  return id;
}

export function selectSession(id: string) {
  mutate((db) => ({ ...db, currentId: id }));
}

export function deleteSession(id: string) {
  mutate((db) => {
    const sessions = db.sessions.filter((s) => s.id !== id);
    return {
      sessions,
      currentId: db.currentId === id ? (sessions.at(-1)?.id ?? null) : db.currentId,
    };
  });
}

/** Replace the roster. Players with the same name keep their id (and their games). */
export function setRoster(sessionId: string, names: string[]) {
  mutate((db) =>
    patch(db, sessionId, (s) => {
      const prev = new Map(s.players.map((p) => [p.name.toLocaleLowerCase(), p]));
      const players = names.map(
        (name) => prev.get(name.toLocaleLowerCase()) ?? { id: uid(), name },
      );
      const valid = new Set(players.map((p) => p.id));
      return {
        ...s,
        players,
        games: s.games.map((g) => {
          const playerIds = g.playerIds.filter((id) => valid.has(id));
          const teamsValid = g.teams?.flat().every((id) => valid.has(id));
          return { ...g, playerIds, teams: teamsValid ? g.teams : undefined };
        }),
      };
    }),
  );
}

export function addGame(
  sessionId: string,
  playerIds: string[] = [],
  teams?: [Team, Team],
) {
  mutate((db) =>
    patch(db, sessionId, (s) => ({
      ...s,
      games: [...s.games, { id: uid(), playerIds, teams, createdAt: Date.now() }],
    })),
  );
}

export function removeGame(sessionId: string, gameId: string) {
  mutate((db) =>
    patch(db, sessionId, (s) => ({
      ...s,
      games: s.games.filter((g) => g.id !== gameId),
    })),
  );
}

export function clearGames(sessionId: string) {
  mutate((db) => patch(db, sessionId, (s) => ({ ...s, games: [] })));
}

/** Manual check / uncheck of a player in a game. */
export function togglePlayed(sessionId: string, gameId: string, playerId: string) {
  mutate((db) =>
    patch(db, sessionId, (s) => ({
      ...s,
      games: s.games.map((g) =>
        g.id !== gameId
          ? g
          : {
              ...g,
              playerIds: g.playerIds.includes(playerId)
                ? g.playerIds.filter((id) => id !== playerId)
                : [...g.playerIds, playerId],
              // team split is no longer reliable once edited by hand
              teams: undefined,
            },
      ),
    })),
  );
}
