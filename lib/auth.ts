import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import {
  authMeOptions,
  clearBootHint,
  writeBootHint,
} from "./data/query-options";
import { queryClient, queryKeys } from "./query";
import type { ChangePasswordInput, LoginInput } from "./schemas";
import type { AuthUser } from "./types";

export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
} {
  const { data, isPending } = useQuery(authMeOptions);

  useEffect(() => {
    if (isPending) return;
    writeBootHint(data ? "organiser" : "visitor");
  }, [data, isPending]);

  return {
    user: data ?? null,
    loading: isPending,
  };
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: input,
  });
  writeBootHint("organiser");
  queryClient.setQueryData(queryKeys.authMe, user);
  await queryClient.invalidateQueries({ queryKey: ["sessions"] });
  return user;
}

export async function logout(): Promise<void> {
  await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
  clearBootHint();
  queryClient.setQueryData(queryKeys.authMe, null);
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
