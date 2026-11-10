import { api } from "@/lib/api";
import type { ChangePasswordInput, LoginInput } from "./schemas";
import type { AuthUser } from "./types";

export async function fetchMe(): Promise<{ user: AuthUser | null }> {
  return api<{ user: AuthUser | null }>("/auth/me");
}

export async function loginUser(input: LoginInput): Promise<{ user: AuthUser }> {
  return api<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function logoutUser(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/auth/logout", {
    method: "POST",
  });
}

export async function changeUserPassword(
  input: ChangePasswordInput,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/auth/password", {
    method: "POST",
    body: input,
  });
}

