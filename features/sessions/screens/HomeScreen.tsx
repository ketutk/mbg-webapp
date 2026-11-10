"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/toast";
import { AppHeader } from "@/components/AppHeader";
import { LoginDialog } from "@/components/LoginDialog";
import { SessionDialog } from "@/components/SessionDialog";
import { Skeleton } from "@/components/ui";
import { ExternalMatchesView } from "./ExternalMatchesView";
import { SessionsDirectory } from "../components/SessionsDirectory";

export function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader
        active="matches"
        user={user}
        onNewSession={() => setCreating(true)}
        onToast={toast.show}
      />

      <main>
        {authLoading ? (
          <Skeleton className="mt-8 h-80" />
        ) : user ? (
          <SessionsDirectory
            user={user}
            onNewSession={() => setCreating(true)}
          />
        ) : (
          <ExternalMatchesView onLogin={() => setLoggingIn(true)} />
        )}
      </main>

      {creating && (
        <SessionDialog onClose={() => setCreating(false)} />
      )}

      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => toast.show("Logged in")}
        />
      )}
    </div>
  );
}
