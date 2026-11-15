"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { CURRENT_KEY } from "@/lib/data/current-session";
import {
  authMeOptions,
  ORGANISER_LIST_PARAMS,
  readBootHint,
  sessionDetailOptions,
  sessionsPageOptions,
  VISITOR_LIST_PARAMS,
} from "@/lib/data/query-options";
import { queryClient } from "@/lib/query";

if (typeof window !== "undefined") {
  void queryClient.prefetchQuery(authMeOptions);

  if (window.location.pathname === "/") {
    const hint = readBootHint();
    const currentSessionId = window.localStorage.getItem(CURRENT_KEY);
    if (hint?.role === "organiser") {
      if (currentSessionId) {
        void queryClient.prefetchQuery(sessionDetailOptions(currentSessionId));
      }
      void queryClient.prefetchQuery(
        sessionsPageOptions(ORGANISER_LIST_PARAMS),
      );
    } else {
      void queryClient.prefetchQuery(sessionsPageOptions(VISITOR_LIST_PARAMS));
    }
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
