"use client";

import { useAuth } from "@/lib/auth";
import { selectSession, useCurrentSessionId, useHydrated } from "@/lib/store";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import { shimmerCard } from "@/lib/ui";
import { ExternalMatchesView } from "./ExternalMatchesView";
import { InternalMatchesWorkspace } from "./InternalMatchesWorkspace";

export default function MatchApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const currentId = useCurrentSessionId();

  const openLogin = useUiStore((s) => s.openLogin);
  const showToast = useToast();

  function handleSelectSession(id: string) {
    selectSession(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return !hydrated || authLoading ? (
    <div className={shimmerCard} aria-busy="true" />
  ) : user ? (
    <InternalMatchesWorkspace
      user={user}
      currentSessionId={currentId}
      onSelectSession={handleSelectSession}
      onToast={showToast}
    />
  ) : (
    <ExternalMatchesView
      currentSessionId={currentId}
      onSelectSession={handleSelectSession}
      onLogin={openLogin}
    />
  );
}
