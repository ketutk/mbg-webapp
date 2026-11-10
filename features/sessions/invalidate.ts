import type { QueryClient } from "@tanstack/react-query";
import { sessionKeys } from "./keys";

export async function invalidateSession(qc: QueryClient, id: string): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: sessionKeys.detail(id) }),
    qc.invalidateQueries({ queryKey: sessionKeys.summary(id) }),
    qc.invalidateQueries({ queryKey: sessionKeys.list }),
  ]);
}

