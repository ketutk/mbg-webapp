import { QueryClient } from "@tanstack/react-query";
import type { SessionsFilterParams, TreasuryFilterParams } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2_000,
      refetchOnWindowFocus: true,
    },
  },
});

export const queryKeys = {
  authMe: ["auth", "me"] as const,
  sessionsList: ["sessions", "list"] as const,
  sessionsPage: (params?: SessionsFilterParams) =>
    ["sessions", "list", params ?? {}] as const,
  sessionSummary: (id: string) => ["sessions", "summary", id] as const,
  sessionDetail: (id: string) => ["sessions", "detail", id] as const,
  treasury: ["treasury"] as const,
  treasurySummary: (params?: TreasuryFilterParams) =>
    ["treasury", "summary", params ?? {}] as const,
  admins: ["admins", "list"] as const,
};


