import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type {
  TreasuryCategoryInput,
  TreasuryCategoryPatchInput,
  TreasuryInput,
  TreasuryPatchInput,
} from "../schemas";
import type { TreasuryCategory, TreasuryEntry } from "../types";

export async function addTreasuryEntry(
  input: TreasuryInput,
): Promise<TreasuryEntry> {
  const { entry } = await api<{ entry: TreasuryEntry }>("/treasury/entries", {
    method: "POST",
    body: input,
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return entry;
}

export async function editTreasuryEntry(
  id: string,
  input: TreasuryPatchInput,
): Promise<TreasuryEntry> {
  const { entry } = await api<{ entry: TreasuryEntry }>(
    `/treasury/entries/${id}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return entry;
}

export async function removeTreasuryEntry(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/treasury/entries/${id}`, { method: "DELETE" });
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
}

export async function createTreasuryCategory(
  input: TreasuryCategoryInput,
): Promise<TreasuryCategory> {
  const { category } = await api<{ category: TreasuryCategory }>(
    "/treasury/categories",
    {
      method: "POST",
      body: input,
    },
  );
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return category;
}

export async function updateTreasuryCategory(
  id: string,
  input: TreasuryCategoryPatchInput,
): Promise<TreasuryCategory> {
  const { category } = await api<{ category: TreasuryCategory }>(
    `/treasury/categories/${id}`,
    {
      method: "PATCH",
      body: input,
    },
  );
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
  return category;
}

export async function deleteTreasuryCategory(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/treasury/categories/${id}`, {
    method: "DELETE",
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
}
