import { api } from "@/lib/api";
import type { AdminCreateInput, AdminPasswordInput } from "./schemas";
import type { AdminUser } from "./types";

export async function fetchAdminsList(): Promise<AdminUser[]> {
  const { admins } = await api<{ admins: AdminUser[] }>("/admins");
  return admins;
}

export async function postCreateAdmin(
  input: AdminCreateInput,
): Promise<AdminUser> {
  const { admin } = await api<{ admin: AdminUser }>("/admins", {
    method: "POST",
    body: input,
  });
  return admin;
}

export async function deleteAdminRecord(id: string): Promise<void> {
  await api(`/admins/${id}`, { method: "DELETE" });
}

export async function putResetAdminPassword(
  id: string,
  input: AdminPasswordInput,
): Promise<void> {
  await api(`/admins/${id}/password`, {
    method: "PUT",
    body: input,
  });
}

