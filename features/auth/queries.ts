import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";
import { authKeys } from "./keys";
import type { AuthUser } from "./types";

export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
} {
  const { data, isPending } = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
  });
  return {
    user: data?.user ?? null,
    loading: isPending,
  };
}

