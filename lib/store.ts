/* eslint-disable no-restricted-imports */
import { useSyncExternalStore } from "react";
import { todayISO } from "./date";

export { todayISO };

export * from "@/features/auth";
export * from "@/features/sessions";
export * from "@/features/matches";
export * from "@/features/treasury";
export * from "@/features/admins";

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
