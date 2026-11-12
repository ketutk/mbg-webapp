"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, useAuth } from "@/lib/auth";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import { btn, cx, linkBtn, pill, spinner } from "@/lib/ui";
import { MobileDrawer } from "./MobileDrawer";
import { NAV_ITEMS, type NavKey } from "./nav-items";
import { SyncStatus } from "./SyncStatus";

export function AppHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const active: NavKey =
    pathname === "/treasury"
      ? "treasury"
      : pathname === "/admins"
        ? "admins"
        : "matches";

  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const openLogin = useUiStore((s) => s.openLogin);
  const openPassword = useUiStore((s) => s.openPassword);
  const openNewSession = useUiStore((s) => s.openNewSession);
  const showToast = useToast();

  const [loggingOut, setLoggingOut] = useState(false);

  const isSuperadmin = user?.role === "SUPERADMIN";
  const showNewSession = isSuperadmin && active === "matches";

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      closeDrawer();
      showToast("Signed out");
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
          <SyncStatus variant="desktop" />

          {user ? (
            <>
              <nav
                className="flex items-center gap-1.5"
                aria-label="Main navigation"
              >
                {NAV_ITEMS.filter(
                  (item) => !item.superadminOnly || isSuperadmin,
                ).map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={btn(
                      active === item.key ? "primary" : "light",
                      "sm",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <span className="flex items-center gap-1.5 pl-1 text-xs font-bold text-[#254f77]">
                <span>{user.username}</span>
                <span className={pill(isSuperadmin ? "ok" : "default")}>
                  {user.role}
                </span>
              </span>

              <button className={linkBtn} onClick={openPassword}>
                Password
              </button>

              {showNewSession && (
                <button
                  id="new-session"
                  className={btn("primary", "sm")}
                  onClick={openNewSession}
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
                onClick={openLogin}
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
              {showNewSession && (
                <button
                  className={btn("primary", "sm")}
                  onClick={openNewSession}
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
                onClick={openDrawer}
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
              <button className={btn("light", "sm")} onClick={openLogin}>
                Admin login
              </button>
            </>
          )}
        </div>
      </header>

      <MobileDrawer
        active={active}
        user={user}
        isSuperadmin={isSuperadmin}
        showNewSession={showNewSession}
        loggingOut={loggingOut}
        onLogout={() => void handleLogout()}
      />
    </>
  );
}
