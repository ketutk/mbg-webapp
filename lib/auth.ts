import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { queryClient, queryKeys } from "./query";
import type { ChangePasswordInput, LoginInput } from "./schemas";
import type { AuthUser } from "./types";

export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
} {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.authMe,
    queryFn: () => api<{ user: AuthUser | null }>("/auth/me"),
  });
  return {
    user: data?.user ?? null,
    loading: isPending,
  };
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: input,
  });
  queryClient.setQueryData(queryKeys.authMe, { user });
  await queryClient.invalidateQueries({ queryKey: ["sessions"] });
  return user;
}

export async function logout(): Promise<void> {
  await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
  queryClient.setQueryData(queryKeys.authMe, { user: null });
  queryClient.removeQueries({ queryKey: ["sessions", "detail"] });
  queryClient.removeQueries({ queryKey: queryKeys.treasury });
  queryClient.removeQueries({ queryKey: queryKeys.admins });
  await queryClient.invalidateQueries({ queryKey: ["sessions"] });
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api<{ ok: boolean }>("/auth/password", {
    method: "POST",
    body: input,
  });
}
