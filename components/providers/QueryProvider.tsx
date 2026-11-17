"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
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

  const pathname = window.location.pathname;
  const hint = readBootHint();
  if (pathname === "/sessions") {
    if (hint?.role === "organiser") {
      void queryClient.prefetchQuery(
        sessionsPageOptions(ORGANISER_LIST_PARAMS),
      );
    } else {
      void queryClient.prefetchQuery(sessionsPageOptions(VISITOR_LIST_PARAMS));
    }
  } else if (pathname.startsWith("/sessions/")) {
    const id = pathname.slice("/sessions/".length).split("/")[0];
    if (id && hint?.role === "organiser") {
      void queryClient.prefetchQuery(sessionDetailOptions(id));
    }
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
