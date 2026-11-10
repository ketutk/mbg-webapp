import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTreasurySummary } from "./api";
import { treasuryKeys } from "./keys";
import type { TreasuryFilterParams } from "./types";

export function useTreasury(params?: TreasuryFilterParams) {
  const query = useQuery({
    queryKey: treasuryKeys.filter(params),
    queryFn: () => fetchTreasurySummary(params),
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

