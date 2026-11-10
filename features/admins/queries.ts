import { useQuery } from "@tanstack/react-query";
import { fetchAdminsList } from "./api";
import { adminKeys } from "./keys";

export function useAdmins() {
  const query = useQuery({
    queryKey: adminKeys.list,
    queryFn: fetchAdminsList,
  });

  return {
    data: query.data,
    error: query.error,
    loading: query.isPending,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}
