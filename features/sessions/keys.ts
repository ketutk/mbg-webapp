import type { SessionsFilterParams } from "./types";

export const sessionKeys = {
  all: ["sessions"] as const,
  list: ["sessions", "list"] as const,
  page: (params?: SessionsFilterParams) =>
    [...sessionKeys.list, params ?? {}] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
  summary: (id: string) => [...sessionKeys.all, "summary", id] as const,
};

