import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeUserPassword, loginUser, logoutUser } from "./api";
import { authKeys } from "./keys";
import type { ChangePasswordInput, LoginInput } from "./schemas";
import type { AuthUser } from "./types";

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    meta: { success: "Logged in", error: "Login failed" },
    onSuccess: (data) => {
      qc.setQueryData(authKeys.me, { user: data.user });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    meta: { success: "Signed out", error: "Could not sign out" },
    onSuccess: () => {
      qc.setQueryData(authKeys.me, { user: null });
      qc.removeQueries({ queryKey: ["sessions", "detail"] });
      qc.removeQueries({ queryKey: ["treasury"] });
      qc.removeQueries({ queryKey: ["admins"] });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changeUserPassword(input),
    meta: {
      success: "Password updated — other sessions signed out",
      error: "Could not update password",
    },
  });
}

// Standalone actions using queryClient instance for compatibility with old imports
export async function login(input: LoginInput): Promise<AuthUser> {
  const res = await loginUser(input);
  return res.user;
}

export async function logout(): Promise<void> {
  await logoutUser();
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await changeUserPassword(input);
}

