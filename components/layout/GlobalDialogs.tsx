"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { useToast, useUiStore } from "@/lib/stores/ui-store";

const LoginDialog = dynamic(() =>
  import("@/components/auth/LoginDialog").then((m) => m.LoginDialog),
);
const PasswordDialog = dynamic(() =>
  import("@/components/auth/PasswordDialog").then((m) => m.PasswordDialog),
);
const SessionDialog = dynamic(() =>
  import("@/components/matches/SessionDialog").then((m) => m.SessionDialog),
);

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

  useEffect(() => {
    const warm = () => {
      if (!user) {
        void import("@/components/auth/LoginDialog");
      } else {
        void import("@/components/auth/PasswordDialog");
        if (isSuperadmin) {
          void import("@/components/matches/SessionDialog");
        }
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, [user, isSuperadmin]);

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

