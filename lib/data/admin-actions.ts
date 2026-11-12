import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type { AdminCreateInput, AdminPasswordInput } from "../schemas";
import type { AdminUser } from "../types";

export async function createAdmin(input: AdminCreateInput): Promise<AdminUser> {
  const { admin } = await api<{ admin: AdminUser }>("/admins", {
    method: "POST",
    body: input,
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.admins });
  return admin;
}

export async function deleteAdmin(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/admins/${id}`, { method: "DELETE" });
  await queryClient.invalidateQueries({ queryKey: queryKeys.admins });
}

export async function resetAdminPassword(
  id: string,
  input: AdminPasswordInput,
): Promise<void> {
  await api<{ ok: boolean }>(`/admins/${id}/password`, {
    method: "PUT",
    body: input,
  });
}

