"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useIsFetching } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";
import { LoginDialog } from "./LoginDialog";
import { PasswordDialog } from "./PasswordDialog";
import { initials } from "./PlayerGrid";
import { avatar, btn, cx, linkBtn, pill, spinner } from "@/lib/ui";

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

  const isSuperadmin = user?.role === "SUPERADMIN";

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
            <div className="truncate max-[420px]:text-[15px]">
              Minggu Badminton Guys
            </div>
            <small className="mt-0.5 block font-sans text-[10px] font-semibold tracking-[0.65px] text-[#7d9ab4]">
              FAIR MATCH PLANNER
            </small>
          </div>
        </Link>

        {/* Desktop controls (> 860px) */}
        <div className="flex items-center gap-2.5 max-[860px]:hidden">
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

          {user ? (
            <>
              <nav
                className="flex items-center gap-1.5"
                aria-label="Main navigation"
              >
                <Link
                  href="/"
                  className={btn(
                    active === "matches" ? "primary" : "light",
                    "sm",
                  )}
                >
                  Matches
                </Link>
                <Link
                  href="/treasury"
                  className={btn(
                    active === "treasury" ? "primary" : "light",
                    "sm",
                  )}
                >
                  Treasury
                </Link>
                {isSuperadmin && (
                  <Link
                    href="/admins"
                    className={btn(
                      active === "admins" ? "primary" : "light",
                      "sm",
                    )}
                  >
                    Admins
                  </Link>
                )}
              </nav>

              <span className="flex items-center gap-1.5 pl-1 text-xs font-bold text-[#254f77]">
                <span>{user.username}</span>
                <span className={pill(isSuperadmin ? "ok" : "default")}>
                  {user.role}
                </span>
              </span>

              <button
                className={linkBtn}
                onClick={() => setChangingPass(true)}
              >
                Password
              </button>

              {isSuperadmin && onNewSession && (
                <button
                  id="new-session"
                  className={btn("primary", "sm")}
                  onClick={onNewSession}
                >
                  ＋ New session
                </button>
              )}

              <button
                id="logout-btn"
                className={btn("light", "sm")}
                disabled={loggingOut}
                onClick={() => void handleLogout()}
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
          ) : (
            <>
              {active !== "matches" && (
                <Link href="/" className={btn("light", "sm")}>
                  ← Back to matches
                </Link>
              )}
              <button
                id="admin-login-btn"
                className={btn("light", "sm")}
                onClick={() => setLoggingIn(true)}
              >
                Admin login
              </button>
            </>
          )}
        </div>

        {/* Tablet & phone controls (<= 860px) */}
        <div className="hidden items-center gap-2 max-[860px]:flex">
          {user ? (
            <>
              {isSuperadmin && onNewSession && (
                <button
                  className={btn("primary", "sm")}
                  onClick={onNewSession}
                >
                  ＋ New
                </button>
              )}
              <button
                type="button"
                id="mobile-menu-btn"
                className={cx(
                  btn("light", "sm"),
                  "flex items-center gap-1.5 px-3 py-2",
                )}
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
              <button
                className={btn("light", "sm")}
                onClick={() => setLoggingIn(true)}
              >
                Admin login
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tablet & phone slide-over sidebar drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 hidden animate-fade bg-[#23466ac9] max-[860px]:block"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setDrawerOpen(false)
          }
        >
          <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(300px,84vw)] flex-col justify-between border-l border-[#e3eff9] bg-white p-5 shadow-[0_24px_80px_#123b6133]">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#eef4f9] pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#204a74]">
                    {isFetching > 0 ? (
                      <>
                        <span className={cx(spinner, "size-2.5 text-[#5da5e4]")} />
                        <span>Syncing…</span>
                      </>
                    ) : (
                      <>
                        <i className="size-2 rounded-full bg-[#53b8a3]" />
                        <span>Live</span>
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-xl border border-[#deedf9] bg-[#f2f8fe] text-sm font-extrabold text-[#3c78aa]"
                  aria-label="Close navigation menu"
                  onClick={() => setDrawerOpen(false)}
                >
                  ✕
                </button>
              </div>

              {user && (
                <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-[#e3f0fb] bg-[#f6fbff] p-3">
                  <span className={avatar}>{initials(user.username)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold text-[#204a74]">
                      {user.username}
                    </div>
                    <div className="mt-0.5">
                      <span className={pill(isSuperadmin ? "ok" : "default")}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <nav
                className="mt-4 flex flex-col gap-1.5"
                aria-label="Mobile navigation"
              >
                <div className="px-1 pb-1 text-[10px] font-extrabold tracking-[1.4px] text-[#7790a8] uppercase">
                  Navigation
                </div>
                <Link
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className={cx(
                    btn(active === "matches" ? "primary" : "light", "md"),
                    "w-full text-left",
                  )}
                >
                  Matches
                </Link>
                <Link
                  href="/treasury"
                  onClick={() => setDrawerOpen(false)}
                  className={cx(
                    btn(active === "treasury" ? "primary" : "light", "md"),
                    "w-full text-left",
                  )}
                >
                  Treasury
                </Link>
                {isSuperadmin && (
                  <Link
                    href="/admins"
                    onClick={() => setDrawerOpen(false)}
                    className={cx(
                      btn(active === "admins" ? "primary" : "light", "md"),
                      "w-full text-left",
                    )}
                  >
                    Admins
                  </Link>
                )}
              </nav>

              {user && (
                <div className="mt-5 flex flex-col gap-1.5 border-t border-[#eef4f9] pt-4">
                  <div className="px-1 pb-1 text-[10px] font-extrabold tracking-[1.4px] text-[#7790a8] uppercase">
                    Actions
                  </div>
                  {isSuperadmin && onNewSession && (
                    <button
                      type="button"
                      className={cx(btn("primary", "md"), "w-full text-left")}
                      onClick={() => {
                        setDrawerOpen(false);
                        onNewSession();
                      }}
                    >
                      ＋ New session
                    </button>
                  )}
                  <button
                    type="button"
                    className={cx(btn("light", "md"), "w-full text-left")}
                    onClick={() => {
                      setDrawerOpen(false);
                      setChangingPass(true);
                    }}
                  >
                    Change password
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-[#eef4f9] pt-4">
              {user ? (
                <button
                  type="button"
                  className={cx(btn("danger", "md"), "w-full")}
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
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
              ) : (
                <button
                  type="button"
                  className={cx(btn("primary", "md"), "w-full")}
                  onClick={() => {
                    setDrawerOpen(false);
                    setLoggingIn(true);
                  }}
                >
                  Admin login
                </button>
              )}
            </div>
          </aside>
        </div>
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
