import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTreasuryEntry,
  patchTreasuryEntry,
  postTreasuryEntry,
} from "./api";
import { treasuryKeys } from "./keys";
import type { TreasuryInput, TreasuryPatchInput } from "./schemas";
import type { TreasuryEntry } from "./types";

export function useCreateTreasuryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TreasuryInput) => postTreasuryEntry(input),
    meta: { success: "Treasury entry saved", error: "Could not save entry" },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: treasuryKeys.all });
    },
  });
}

export function useUpdateTreasuryEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TreasuryPatchInput) => patchTreasuryEntry(id, input),
    meta: {
      success: "Treasury entry updated",
      error: "Could not update entry",
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: treasuryKeys.all });
    },
  });
}

export function useDeleteTreasuryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTreasuryEntry(id),
    meta: {
      success: "Treasury entry deleted",
      error: "Could not delete entry",
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: treasuryKeys.all });
    },
  });
}

// Standalone actions for backward compatibility
export async function addTreasuryEntry(
  input: TreasuryInput,
): Promise<TreasuryEntry> {
  return postTreasuryEntry(input);
}

export async function editTreasuryEntry(
  id: string,
  input: TreasuryPatchInput,
): Promise<TreasuryEntry> {
  return patchTreasuryEntry(id, input);
}

export async function removeTreasuryEntry(id: string): Promise<void> {
  await deleteTreasuryEntry(id);
}

