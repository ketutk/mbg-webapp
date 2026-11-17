"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/initials";
import { useUiStore } from "@/lib/stores/ui-store";
import type { AuthUser } from "@/lib/types";
import { avatar, btn, cx, pill, spinner } from "@/lib/ui";
import { NAV_ITEMS, type NavItem, type NavKey } from "./nav-items";
import { SyncStatus } from "./SyncStatus";

function NavIcon({ kind }: { kind: NavKey | "more" }) {
  const props = {
    className: "size-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
          <path d="M8 14h3M13 14h3M8 17.5h3" />
        </svg>
      );
    case "leaderboards":
      return (
        <svg {...props}>
          <path d="M6 20v-7M12 20V5M18 20v-11" />
        </svg>
      );
    case "treasury":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10.5h18" />
          <path d="M16 14.5h2" />
        </svg>
      );
    case "admins":
      return (
        <svg {...props}>
          <path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" />
          <path d="M9.5 12.2 11.3 14l3.5-3.8" />
        </svg>
      );
    case "more":
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function MobileBottomNav({
  active,
  user,
  isSuperadmin,
  loggingOut,
  onLogout,
}: {
  active: NavKey;
  user: AuthUser | null | undefined;
  isSuperadmin: boolean;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const openNewSession = useUiStore((s) => s.openNewSession);
  const openPassword = useUiStore((s) => s.openPassword);

  const visibleItems: NavItem[] = NAV_ITEMS.filter(
    (item) =>
      (!item.organiserOnly || Boolean(user)) &&
      (!item.superadminOnly || isSuperadmin),
  );

  const hasOverflow = visibleItems.length > 4;
  const primaryItems = hasOverflow ? visibleItems.slice(0, 3) : visibleItems;
  const overflowItems = hasOverflow ? visibleItems.slice(3) : [];
  const overflowActive = overflowItems.some((item) => item.key === active);
  const moreOpen = hasOverflow && openOnPath === pathname;

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOnPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-20 hidden animate-fade bg-[#173b6640] max-[860px]:block"
          aria-hidden="true"
          onClick={() => setOpenOnPath(null)}
        />
      )}

      <div className="fixed inset-x-3.5 bottom-3 z-30 mx-auto hidden max-w-[480px] max-[860px]:block">
        {moreOpen && (
          <div
            role="dialog"
            aria-label="More navigation and account options"
            className="mb-2.5 animate-pop rounded-[22px] border border-[#cbe2f6] bg-white/95 p-3 shadow-[0_16px_40px_#173b662e] backdrop-blur-md"
          >
            {user && (
              <div className="mb-2.5 flex items-center justify-between gap-2.5 rounded-2xl border border-[#e3f0fb] bg-[#f6fbff] p-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={avatar}>{initials(user.username)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-[#204a74]">
                      {user.username}
                    </div>
                    <span className={pill(isSuperadmin ? "ok" : "default")}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <SyncStatus variant="drawer" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {overflowItems.map((item) => {
                const isActive = active === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpenOnPath(null)}
                    className={cx(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold no-underline transition-colors",
                      isActive
                        ? "bg-[linear-gradient(135deg,#589edb,#76b6e9)] text-white shadow-[0_5px_12px_#5596cc2b]"
                        : "border border-[#deedf9] bg-[#f2f8fe] text-[#204a74] hover:bg-[#e7f3fe]",
                    )}
                  >
                    <NavIcon kind={item.key} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {user && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#eef4f9] pt-2.5">
                <button
                  type="button"
                  className={cx(btn("primary", "sm"), "flex-1")}
                  onClick={() => {
                    setOpenOnPath(null);
                    openNewSession();
                  }}
                >
                  ＋ New session
                </button>
                <button
                  type="button"
                  className={cx(btn("light", "sm"), "flex-1")}
                  onClick={() => {
                    setOpenOnPath(null);
                    openPassword();
                  }}
                >
                  Password
                </button>
                <button
                  type="button"
                  className={btn("danger", "sm")}
                  disabled={loggingOut}
                  onClick={() => {
                    setOpenOnPath(null);
                    onLogout();
                  }}
                >
                  {loggingOut ? (
                    <>
                      <span className={cx(spinner, "mr-1")} />
                      Signing out…
                    </>
                  ) : (
                    "Log out"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <nav
          aria-label="Mobile navigation"
          className="rounded-[26px] border border-[#cbe2f6] bg-white/95 px-2 py-1.5 shadow-[0_14px_36px_#173b6626] backdrop-blur-md"
        >
          <div
            className={cx(
              "grid gap-1",
              hasOverflow || primaryItems.length === 4
                ? "grid-cols-4"
                : "grid-cols-3",
            )}
          >
            {primaryItems.map((item) => {
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpenOnPath(null)}
                  className={cx(
                    "flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-1.5 text-[11px] font-bold no-underline transition-colors",
                    isActive
                      ? "bg-[#eaf5ff] text-[#183e6b]"
                      : "text-[#5d7f9d] hover:text-[#204a74]",
                  )}
                >
                  <NavIcon kind={item.key} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {hasOverflow && (
              <button
                type="button"
                id="mobile-more-btn"
                aria-expanded={moreOpen}
                aria-label="More menu options"
                onClick={() =>
                  setOpenOnPath((prev) => (prev === pathname ? null : pathname))
                }
                className={cx(
                  "flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-1.5 text-[11px] font-bold transition-colors",
                  moreOpen || overflowActive
                    ? "bg-[#eaf5ff] text-[#183e6b]"
                    : "text-[#5d7f9d] hover:text-[#204a74]",
                )}
              >
                <NavIcon kind="more" />
                <span>More</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
