import { api } from "./api";
import { invalidate, setQueryData, useQuery } from "./query";
import type { ChangePasswordInput, LoginInput } from "./schemas";
import type { AuthUser } from "./types";

const AUTH_KEY = "auth:me";

export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
} {
  const { data, loading } = useQuery(AUTH_KEY, () =>
    api<{ user: AuthUser | null }>("/auth/me"),
  );
  return {
    user: data?.user ?? null,
    loading,
  };
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: input,
  });
  setQueryData<{ user: AuthUser | null }>(AUTH_KEY, () => ({ user }));
  invalidate("session");
  return user;
}

export async function logout(): Promise<void> {
  await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
  setQueryData<{ user: AuthUser | null }>(AUTH_KEY, () => ({ user: null }));
  invalidate("session");
  invalidate("treasury");
  invalidate("admins");
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api<{ ok: boolean }>("/auth/password", {
    method: "POST",
    body: input,
  });
}

