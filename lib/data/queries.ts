import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "../query";
import type {
  AdminUser,
  ClubSettings,
  SessionSummary,
  SessionsFilterParams,
  TournamentDetail,
  TournamentListItem,
  TournamentStatus,
  TreasuryCategory,
  TreasuryFilterParams,
  TreasurySummary,
} from "../types";
import { DEFAULT_CLUB_SETTINGS } from "../site";
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
      if (params?.categoryId) sp.set("categoryId", params.categoryId);
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

export function useTreasuryCategories() {
  const query = useQuery({
    queryKey: queryKeys.treasuryCategories,
    queryFn: async () => {
      const { categories } = await api<{ categories: TreasuryCategory[] }>(
        "/treasury/categories",
      );
      return categories;
    },
  });

  return {
    data: query.data ?? [],
    loading: query.isPending,
    fetching: query.isFetching,
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

export function useClubSettings() {
  const query = useQuery({
    queryKey: queryKeys.clubSettings,
    queryFn: async () => {
      const { settings } = await api<{ settings: ClubSettings }>(
        "/club-settings",
      );
      return settings;
    },
    placeholderData: DEFAULT_CLUB_SETTINGS,
    staleTime: 60_000,
  });

  return {
    data: query.data ?? DEFAULT_CLUB_SETTINGS,
    loading: query.isPending,
    fetching: query.isFetching,
  };
}

export function useTournamentsList(
  params?: { sessionId?: string; status?: TournamentStatus },
  pollMs = 10_000,
) {
  const query = useQuery({
    queryKey: queryKeys.tournamentsList(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.sessionId) sp.set("sessionId", params.sessionId);
      if (params?.status) sp.set("status", params.status);
      const qs = sp.toString();
      const { tournaments } = await api<{ tournaments: TournamentListItem[] }>(
        qs ? `/tournaments?${qs}` : "/tournaments",
      );
      return tournaments;
    },
    placeholderData: keepPreviousData,
    refetchInterval: pollMs,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data ?? [],
    error: query.error,
    loading: query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useTournamentDetail(tournamentId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.tournamentDetail(tournamentId ?? ""),
    queryFn: async () => {
      const { tournament } = await api<{ tournament: TournamentDetail }>(
        `/tournaments/${tournamentId}`,
      );
      return tournament;
    },
    enabled: Boolean(tournamentId),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    error: query.error,
    loading: Boolean(tournamentId) && query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

