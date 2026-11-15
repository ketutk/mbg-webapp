import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "../query";
import type {
  AuthUser,
  Session,
  SessionsFilterParams,
  SessionsPage,
} from "../types";

export const BOOT_KEY = "mbg-boot-v1";

export interface BootHint {
  role: "organiser" | "visitor";
}

export function readBootHint(): BootHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BOOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BootHint>;
    if (parsed.role === "organiser" || parsed.role === "visitor") {
      return { role: parsed.role };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeBootHint(role: "organiser" | "visitor"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOT_KEY, JSON.stringify({ role }));
  } catch {
    // Ignore storage quota or privacy restrictions
  }
}

export function clearBootHint(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BOOT_KEY);
  } catch {
    // Ignore storage restrictions
  }
}

export const VISITOR_LIST_PARAMS: SessionsFilterParams = {
  status: "OPEN",
  page: 1,
  pageSize: 9,
};

export const ORGANISER_LIST_PARAMS: SessionsFilterParams = {
  status: "ALL",
  page: 1,
  pageSize: 10,
};

export const authMeOptions = queryOptions({
  queryKey: queryKeys.authMe,
  queryFn: async () => {
    const { user } = await api<{ user: AuthUser | null }>("/auth/me");
    return user;
  },
  staleTime: 30_000,
});

export const sessionDetailOptions = (sessionId: string) =>
  queryOptions({
    queryKey: queryKeys.sessionDetail(sessionId),
    queryFn: async () => {
      const { session } = await api<{ session: Session }>(
        `/sessions/${sessionId}`,
      );
      return session;
    },
  });

export const sessionsPageOptions = (params?: SessionsFilterParams) =>
  queryOptions({
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
  });

