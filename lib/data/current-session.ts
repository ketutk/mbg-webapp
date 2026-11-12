import { useSyncExternalStore } from "react";

export const CURRENT_KEY = "mbg-current-v2";
const currentListeners = new Set<() => void>();

export function subscribeCurrent(cb: () => void) {
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
