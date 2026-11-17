"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, useAuth } from "@/lib/auth";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import { btn, cx, linkBtn, pill, skelBar, spinner } from "@/lib/ui";
import { MobileBottomNav } from "./MobileBottomNav";
import { NAV_ITEMS, resolveActiveNavKey } from "./nav-items";
import { SyncStatus } from "./SyncStatus";

const headerOuterClass =
  "sticky top-0 z-20 w-full border-b border-[#dcebf8]/80 bg-[#f2f9ff]/85 backdrop-blur-md transition-all duration-300";
const headerInnerClass =
  "mx-auto flex min-h-[76px] max-w-[1190px] items-center justify-between gap-3 px-[30px] py-2.5 max-[860px]:min-h-[64px] max-[860px]:px-3.5";

function HeaderBrand() {
  return (
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
  );
}

export function AppHeaderFallback() {
  return (
    <header className={headerOuterClass}>
      <div className={headerInnerClass}>
        <HeaderBrand />
        <div
          className="flex items-center gap-2.5 max-[860px]:hidden"
          aria-hidden="true"
          data-skeleton=""
        >
          <span className="flex items-center gap-[7px] text-xs text-muted">
            <i className="size-[7px] rounded-full bg-[#53b8a3]" />
            <span>Live</span>
          </span>
          <div className={cx(skelBar("w-20", "h-9"), "rounded-xl")} />
          <div className={cx(skelBar("w-24", "h-9"), "rounded-xl")} />
        </div>
        <div
          className="hidden items-center gap-2 max-[860px]:flex"
          aria-hidden="true"
          data-skeleton=""
        >
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#204a74]">
            <i className="size-2 rounded-full bg-[#53b8a3]" />
            <span>Live</span>
          </span>
          <div className={cx(skelBar("w-[76px]", "h-9"), "rounded-xl")} />
        </div>
      </div>
    </header>
  );
}

export function AppHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const active = resolveActiveNavKey(pathname);

  const openLogin = useUiStore((s) => s.openLogin);
  const openPassword = useUiStore((s) => s.openPassword);
  const openNewSession = useUiStore((s) => s.openNewSession);
  const showToast = useToast();

  const [loggingOut, setLoggingOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  const isSuperadmin = user?.role === "SUPERADMIN";
  const showNewSession = Boolean(user) && active === "sessions";
  const desktopItems = NAV_ITEMS.filter(
    (item) =>
      (!item.organiserOnly || Boolean(user)) &&
      (!item.superadminOnly || isSuperadmin),
  );

  useEffect(() => {
    lastScrollY.current = Math.max(0, window.scrollY);
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      if (y <= 16) {
        setHidden(false);
        lastScrollY.current = y;
        return;
      }
      const delta = y - lastScrollY.current;
      if (delta > 8) {
        setHidden(true);
        lastScrollY.current = y;
      } else if (delta < -6) {
        setHidden(false);
        lastScrollY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      showToast("Signed out");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header
        className={cx(
          headerOuterClass,
          hidden
            ? "pointer-events-none -translate-y-full opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <div className={headerInnerClass}>
          <HeaderBrand />

          {/* Desktop controls (> 860px) */}
          <div className="flex items-center gap-2.5 max-[860px]:hidden">
            <SyncStatus variant="desktop" />

            {loading ? (
              <div
                className="flex items-center gap-2"
                aria-hidden="true"
                data-skeleton=""
              >
                <div className={cx(skelBar("w-20", "h-9"), "rounded-xl")} />
                <div className={cx(skelBar("w-24", "h-9"), "rounded-xl")} />
              </div>
            ) : (
              <>
                <nav
                  className="flex items-center gap-1.5"
                  aria-label="Main navigation"
                >
                  {desktopItems.map((item) => (
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

                {user ? (
                  <>
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
                  <button
                    id="admin-login-btn"
                    className={btn("light", "sm")}
                    onClick={openLogin}
                  >
                    Admin login
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tablet & phone top actions (<= 860px) */}
          <div className="hidden items-center gap-2 max-[860px]:flex">
            <SyncStatus variant="drawer" />
            {loading ? (
              <div
                className={cx(skelBar("w-[76px]", "h-9"), "rounded-xl")}
                aria-hidden="true"
                data-skeleton=""
              />
            ) : user ? (
              showNewSession && (
                <button
                  className={btn("primary", "sm")}
                  onClick={openNewSession}
                >
                  ＋ New
                </button>
              )
            ) : (
              <button className={btn("light", "sm")} onClick={openLogin}>
                Admin login
              </button>
            )}
          </div>
        </div>
      </header>

      <MobileBottomNav
        active={active}
        user={user}
        isSuperadmin={isSuperadmin}
        loggingOut={loggingOut}
        onLogout={() => void handleLogout()}
      />
    </>
  );
}
