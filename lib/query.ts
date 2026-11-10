import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "./toast";
import type { SessionsFilterParams, TreasuryFilterParams } from "./types";

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const meta = mutation.meta as { success?: string } | undefined;
      if (meta?.success) {
        toast.show(meta.success);
      }
    },
    onError: (error, _variables, _context, mutation) => {
      const meta = mutation.meta as { error?: string } | undefined;
      const defaultMsg = meta?.error ?? "Something went wrong";
      toast.show(error instanceof Error ? error.message : defaultMsg);
    },
  }),
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


