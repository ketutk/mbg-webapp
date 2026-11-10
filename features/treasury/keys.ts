import type { TreasuryFilterParams } from "./types";

export const treasuryKeys = {
  all: ["treasury"] as const,
  summary: ["treasury", "summary"] as const,
  filter: (params?: TreasuryFilterParams) =>
    [...treasuryKeys.summary, params ?? {}] as const,
};

