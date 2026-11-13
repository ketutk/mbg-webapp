import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "../query";
import type {
  AdminUser,
  SessionSummary,
  SessionsFilterParams,
  TreasuryFilterParams,
  TreasurySummary,
} from "../types";
import { sessionDetailOptions, sessionsPageOptions } from "./query-options";

export function useSessionsList(
  params?: SessionsFilterParams,
  pollMs = 10_000,
) {
  const query = useQuery({
    ...sessionsPageOptions(params),
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
    ...sessionDetailOptions(sessionId ?? ""),
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

