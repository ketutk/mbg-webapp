import { api } from "@/lib/api";
import type { TreasuryInput, TreasuryPatchInput } from "./schemas";
import type { TreasuryEntry, TreasuryFilterParams, TreasurySummary } from "./types";

function buildTreasurySearchParams(params: TreasuryFilterParams = {}): string {
  const sp = new URLSearchParams();
  const { from, to, type, q, page, pageSize } = params;
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  if (type && type !== "ALL") sp.set("type", type);
  if (q?.trim()) sp.set("q", q.trim());
  if (page && page > 1) sp.set("page", String(page));
  if (pageSize) sp.set("pageSize", String(pageSize));
  return sp.toString();
}

export async function fetchTreasurySummary(
  params?: TreasuryFilterParams,
): Promise<TreasurySummary> {
  const qs = buildTreasurySearchParams(params);
  return api<TreasurySummary>(qs ? `/treasury?${qs}` : "/treasury");
}

export async function postTreasuryEntry(
  input: TreasuryInput,
): Promise<TreasuryEntry> {
  const { entry } = await api<{ entry: TreasuryEntry }>("/treasury/entries", {
    method: "POST",
    body: input,
  });
  return entry;
}

export async function patchTreasuryEntry(
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
  return entry;
}

export async function deleteTreasuryEntry(id: string): Promise<void> {
  await api(`/treasury/entries/${id}`, { method: "DELETE" });
}
