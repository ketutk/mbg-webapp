"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useIsFetching } from "@tanstack/react-query";
import { can, logout } from "@/features/auth";
import type { AuthUser } from "@/lib/types";
import { LoginDialog } from "./LoginDialog";
import { PasswordDialog } from "./PasswordDialog";
import { MobileDrawer } from "./MobileDrawer";
import { btn, cx, linkBtn, pill, spinner } from "@/lib/ui";

function LiveSyncIndicator({ isFetching }: { isFetching: number }) {
  return (
    <span className="flex items-center gap-[7px] text-xs text-muted">
      {isFetching > 0 ? (
        <>
          <span className={cx(spinner, "size-2.5 text-[#5da5e4]")} />
          <span>Syncing…</span>
        </>
      ) : (
        <>
          <i className="size-[7px] rounded-full bg-[#53b8a3]" />
          <span>Live</span>
        </>
      )}
    </span>
  );
}

function DesktopControls({
  active,
  user,
  isSuperadmin,
  loggingOut,
  onNewSession,
  onChangePass,
  onLogout,
  onLogin,
}: {
  active: "matches" | "treasury" | "admins";
  user: AuthUser | null;
  isSuperadmin: boolean;
  loggingOut: boolean;
  onNewSession?: () => void;
  onChangePass: () => void;
  onLogout: () => void;
  onLogin: () => void;
}) {
  if (!user) {
    return (
      <>
        {active !== "matches" && (
          <Link href="/" className={btn("light", "sm")}>
            ← Back to matches
          </Link>
        )}
        <button
          type="button"
          id="admin-login-btn"
          className={btn("light", "sm")}
          onClick={onLogin}
        >
          Admin login
        </button>
      </>
    );
  }

  return (
    <>
      <nav className="flex items-center gap-1.5" aria-label="Main navigation">
        <Link href="/" className={btn(active === "matches" ? "primary" : "light", "sm")}>
          Matches
        </Link>
        <Link href="/treasury" className={btn(active === "treasury" ? "primary" : "light", "sm")}>
          Treasury
        </Link>
        {isSuperadmin && (
          <Link href="/admins" className={btn(active === "admins" ? "primary" : "light", "sm")}>
            Admins
          </Link>
        )}
      </nav>

      <span className="flex items-center gap-1.5 pl-1 text-xs font-bold text-[#254f77]">
        <span>{user.username}</span>
        <span className={pill(isSuperadmin ? "ok" : "default")}>{user.role}</span>
      </span>

      <button type="button" className={linkBtn} onClick={onChangePass}>
        Password
      </button>

      {isSuperadmin && onNewSession && (
        <button type="button" id="new-session" className={btn("primary", "sm")} onClick={onNewSession}>
          ＋ New session
        </button>
      )}

      <button
        type="button"
        id="logout-btn"
        className={btn("light", "sm")}
        disabled={loggingOut}
        onClick={onLogout}
      >
        {loggingOut ? (
          <>
            <span className={cx(spinner, "mr-1.5")} />
            Signing out…
          </>
        ) : (
          "Log out"
        )}
      </button>
    </>
  );
}

export function AppHeader({
  active,
  user,
  onNewSession,
  onToast,
}: {
  active: "matches" | "treasury" | "admins";
  user: AuthUser | null;
  onNewSession?: () => void;
  onToast: (msg: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isFetching = useIsFetching();

  const isSuperadmin = user ? can(user, "session:manage") : false;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setDrawerOpen(false);
      onToast("Signed out");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-[#dcebf8] py-2.5 max-[860px]:min-h-[64px]">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 font-display text-base font-extrabold tracking-[-0.35px] text-ink no-underline"
        >
          <Image
            src="/logo.jpg"
            alt="MBG · Minggu Badminton Guys logo"
            width={40}
            height={40}
            priority
            className="size-10 flex-none rounded-[14px] object-cover shadow-[0_5px_13px_#4898d834] max-[860px]:size-9"
          />
          <div className="min-w-0">
            <div className="truncate max-[420px]:text-[15px]">Minggu Badminton Guys</div>
            <small className="mt-0.5 block font-sans text-[10px] font-semibold tracking-[0.65px] text-[#7d9ab4]">
              FAIR MATCH PLANNER
            </small>
          </div>
        </Link>

        {/* Desktop controls */}
        <div className="flex items-center gap-2.5 max-[860px]:hidden">
          <LiveSyncIndicator isFetching={isFetching} />
          <DesktopControls
            active={active}
            user={user}
            isSuperadmin={isSuperadmin}
            loggingOut={loggingOut}
            onNewSession={onNewSession}
            onChangePass={() => setChangingPass(true)}
            onLogout={() => void handleLogout()}
            onLogin={() => setLoggingIn(true)}
          />
        </div>

        {/* Mobile controls */}
        <div className="hidden items-center gap-2 max-[860px]:flex">
          {user ? (
            <>
              {isSuperadmin && onNewSession && (
                <button type="button" className={btn("primary", "sm")} onClick={onNewSession}>
                  ＋ New
                </button>
              )}
              <button
                type="button"
                id="mobile-menu-btn"
                className={cx(btn("light", "sm"), "flex items-center gap-1.5 px-3 py-2")}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <span className="text-sm leading-none">☰</span>
                <span>Menu</span>
              </button>
            </>
          ) : (
            <>
              {active !== "matches" && (
                <Link href="/" className={btn("light", "sm")}>
                  ← Matches
                </Link>
              )}
              <button type="button" className={btn("light", "sm")} onClick={() => setLoggingIn(true)}>
                Admin login
              </button>
            </>
          )}
        </div>
      </header>

      {drawerOpen && (
        <MobileDrawer
          active={active}
          user={user}
          isSuperadmin={isSuperadmin}
          isFetching={isFetching}
          loggingOut={loggingOut}
          onClose={() => setDrawerOpen(false)}
          onNewSession={onNewSession}
          onChangePass={() => setChangingPass(true)}
          onLogout={() => void handleLogout()}
          onLogin={() => setLoggingIn(true)}
        />
      )}

      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => onToast("Logged in")}
        />
      )}
      {changingPass && (
        <PasswordDialog
          onClose={() => setChangingPass(false)}
          onSaved={onToast}
        />
      )}
    </>
  );
}
