"use client";

import { useAuth } from "@/lib/auth";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { PasswordDialog } from "@/components/auth/PasswordDialog";
import { SessionDialog } from "@/components/matches/SessionDialog";

export function GlobalDialogs() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === "SUPERADMIN";
  const loginOpen = useUiStore((s) => s.loginOpen);
  const passwordOpen = useUiStore((s) => s.passwordOpen);
  const newSessionOpen = useUiStore((s) => s.newSessionOpen);
  const showToast = useToast();
  const closeLogin = useUiStore((s) => s.closeLogin);
  const closePassword = useUiStore((s) => s.closePassword);
  const closeNewSession = useUiStore((s) => s.closeNewSession);

  return (
    <>
      {newSessionOpen && isSuperadmin && (
        <SessionDialog onClose={closeNewSession} />
      )}
      {loginOpen && (
        <LoginDialog
          onClose={closeLogin}
          onLoggedIn={() => showToast("Logged in")}
        />
      )}
      {passwordOpen && (
        <PasswordDialog onClose={closePassword} onSaved={showToast} />
      )}
    </>
  );
}

