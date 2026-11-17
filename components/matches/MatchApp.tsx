"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { selectSession } from "@/lib/store";
import { useUiStore } from "@/lib/stores/ui-store";
import { SessionsDirectory } from "./admin/SessionsDirectory";
import { ExternalMatchesView } from "./ExternalMatchesView";
import { MatchesSkeleton } from "./MatchesSkeleton";

export default function MatchApp() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const openLogin = useUiStore((s) => s.openLogin);

  function handleSelectSession(id: string) {
    selectSession(id);
    router.push(`/sessions/${id}`);
  }

  return authLoading ? (
    <MatchesSkeleton />
  ) : user ? (
    <SessionsDirectory
      user={user}
      currentSessionId={null}
      onSelectSession={handleSelectSession}
    />
  ) : (
    <ExternalMatchesView
      onSelectSession={handleSelectSession}
      onLogin={openLogin}
    />
  );
}
