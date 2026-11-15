"use client";

import { useAuth } from "@/lib/auth";
import { selectSession, useCurrentSessionId } from "@/lib/store";
import { useUiStore } from "@/lib/stores/ui-store";
import { ExternalMatchesView } from "./ExternalMatchesView";
import { InternalMatchesWorkspace } from "./InternalMatchesWorkspace";
import { MatchesSkeleton } from "./MatchesSkeleton";

export default function MatchApp() {
  const { user, loading: authLoading } = useAuth();
  const currentId = useCurrentSessionId();

  const openLogin = useUiStore((s) => s.openLogin);

  function handleSelectSession(id: string) {
    selectSession(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return authLoading ? (
    <MatchesSkeleton />
  ) : user ? (
    <InternalMatchesWorkspace
      user={user}
      currentSessionId={currentId}
      onSelectSession={handleSelectSession}
    />
  ) : (
    <ExternalMatchesView
      currentSessionId={currentId}
      onSelectSession={handleSelectSession}
      onLogin={openLogin}
    />
  );
}
