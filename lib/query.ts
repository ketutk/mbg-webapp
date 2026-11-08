import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { ApiError } from "./api";

interface CacheEntry<T = unknown> {
  data?: T;
  error: ApiError | null;
  loading: boolean;
  updatedAt: number;
  inFlight?: Promise<T>;
  fetcher?: () => Promise<T>;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

const EMPTY_ENTRY: CacheEntry<undefined> = {
  data: undefined,
  error: null,
  loading: true,
  updatedAt: 0,
};

function notify(key: string) {
  const set = listeners.get(key);
  if (set) set.forEach((cb) => cb());
}

function subscribeKey(key: string | null, cb: () => void) {
  if (!key) return () => {};
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
  };
}

function getEntry<T>(key: string | null): CacheEntry<T> {
  if (!key) return EMPTY_ENTRY as CacheEntry<T>;
  return (cache.get(key) as CacheEntry<T> | undefined) ?? (EMPTY_ENTRY as CacheEntry<T>);
}

async function runFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const prev = cache.get(key) as CacheEntry<T> | undefined;
  if (prev?.inFlight) return prev.inFlight;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, {
        data,
        error: null,
        loading: false,
        updatedAt: Date.now(),
        fetcher,
      });
      notify(key);
      return data;
    })
    .catch((err: ApiError) => {
      const current = cache.get(key) as CacheEntry<T> | undefined;
      cache.set(key, {
        data: current?.data,
        error: err,
        loading: false,
        updatedAt: Date.now(),
        fetcher,
      });
      notify(key);
      throw err;
    });

  cache.set(key, {
    data: prev?.data,
    error: prev?.error ?? null,
    loading: prev?.data === undefined,
    updatedAt: prev?.updatedAt ?? 0,
    inFlight: promise,
    fetcher,
  });
  notify(key);

  return promise;
}

export function setQueryData<T>(
  key: string,
  updater: (prev: T | undefined) => T | undefined,
) {
  const prev = cache.get(key) as CacheEntry<T> | undefined;
  const nextData = updater(prev?.data);
  cache.set(key, {
    data: nextData,
    error: null,
    loading: false,
    updatedAt: Date.now(),
    fetcher: prev?.fetcher,
  });
  notify(key);
}

export function getQueryData<T>(key: string): T | undefined {
  return (cache.get(key) as CacheEntry<T> | undefined)?.data;
}

export function invalidate(prefix: string) {
  for (const [key, entry] of cache.entries()) {
    if (key.startsWith(prefix)) {
      if (entry.fetcher && (listeners.get(key)?.size ?? 0) > 0) {
        void runFetch(key, entry.fetcher).catch(() => {});
      } else {
        cache.delete(key);
        notify(key);
      }
    }
  }
}

export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: { pollMs?: number },
) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const subscribe = useCallback(
    (cb: () => void) => subscribeKey(key, cb),
    [key],
  );
  const getSnapshot = useCallback(() => getEntry<T>(key), [key]);
  const getServerSnapshot = useCallback(
    () => EMPTY_ENTRY as CacheEntry<T>,
    [],
  );

  const entry = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refetch = useCallback(async () => {
    if (!key) return;
    await runFetch(key, () => fetcherRef.current()).catch(() => {});
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const existing = cache.get(key) as CacheEntry<T> | undefined;
    if (existing) {
      existing.fetcher = () => fetcherRef.current();
    }
    void runFetch(key, () => fetcherRef.current()).catch(() => {});

    const onFocus = () => {
      if (!document.hidden) {
        void runFetch(key, () => fetcherRef.current()).catch(() => {});
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    let timer: ReturnType<typeof setInterval> | undefined;
    if (options?.pollMs && options.pollMs > 0) {
      timer = setInterval(() => {
        if (!document.hidden) {
          void runFetch(key, () => fetcherRef.current()).catch(() => {});
        }
      }, options.pollMs);
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (timer) clearInterval(timer);
    };
  }, [key, options?.pollMs]);

  return {
    data: entry.data,
    error: entry.error,
    loading: key ? entry.loading && entry.data === undefined : false,
    refetch,
  };
}

