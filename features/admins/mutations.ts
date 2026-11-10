import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteAdminRecord,
  postCreateAdmin,
  putResetAdminPassword,
} from "./api";
import { adminKeys } from "./keys";
import type { AdminCreateInput, AdminPasswordInput } from "./schemas";
import type { AdminUser } from "./types";

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreateInput) => postCreateAdmin(input),
    meta: { success: "Admin created", error: "Could not create admin" },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminRecord(id),
    meta: { success: "Admin deleted", error: "Could not delete admin" },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useResetAdminPassword() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPasswordInput }) =>
      putResetAdminPassword(id, input),
    meta: {
      success: "Password reset — tokens revoked",
      error: "Could not reset password",
    },
  });
}

// Standalone actions for backward compatibility
export async function createAdmin(input: AdminCreateInput): Promise<AdminUser> {
  return postCreateAdmin(input);
}

export async function deleteAdmin(id: string): Promise<void> {
  await deleteAdminRecord(id);
}

export async function resetAdminPassword(
  id: string,
  input: AdminPasswordInput,
): Promise<void> {
  await putResetAdminPassword(id, input);
}

