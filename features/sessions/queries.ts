import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchSessionDetail,
  fetchSessionSummary,
  fetchSessionsPage,
} from "./api";
import { sessionKeys } from "./keys";
import type { SessionsFilterParams } from "./types";

export function useSessionsList(
  params?: SessionsFilterParams,
  pollMs = 10_000,
) {
  const query = useQuery({
    queryKey: sessionKeys.page(params),
    queryFn: () => fetchSessionsPage(params),
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
    queryKey: sessionKeys.summary(sessionId ?? ""),
    queryFn: () => fetchSessionSummary(sessionId ?? ""),
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
    queryKey: sessionKeys.detail(sessionId ?? ""),
    queryFn: () => fetchSessionDetail(sessionId ?? ""),
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

