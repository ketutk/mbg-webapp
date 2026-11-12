"use client";

import Link from "next/link";
import { initials } from "@/lib/initials";
import { useUiStore } from "@/lib/stores/ui-store";
import type { AuthUser } from "@/lib/types";
import { avatar, btn, cx, pill, spinner } from "@/lib/ui";
import { NAV_ITEMS, type NavKey } from "./nav-items";
import { SyncStatus } from "./SyncStatus";

export function MobileDrawer({
  active,
  user,
  isSuperadmin,
  showNewSession,
  loggingOut,
  onLogout,
}: {
  active: NavKey;
  user: AuthUser | null | undefined;
  isSuperadmin: boolean;
  showNewSession: boolean;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const openNewSession = useUiStore((s) => s.openNewSession);
  const openPassword = useUiStore((s) => s.openPassword);
  const openLogin = useUiStore((s) => s.openLogin);

  if (!drawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 hidden animate-fade bg-[#23466ac9] max-[860px]:block"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      onMouseDown={(e) => e.target === e.currentTarget && closeDrawer()}
    >
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(300px,84vw)] flex-col justify-between border-l border-[#e3eff9] bg-white p-5 shadow-[0_24px_80px_#123b6133]">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-[#eef4f9] pb-4">
            <div className="flex items-center gap-2">
              <SyncStatus variant="drawer" />
            </div>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-xl border border-[#deedf9] bg-[#f2f8fe] text-sm font-extrabold text-[#3c78aa]"
              aria-label="Close navigation menu"
              onClick={closeDrawer}
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
            {NAV_ITEMS.filter(
              (item) => !item.superadminOnly || isSuperadmin,
            ).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={closeDrawer}
                className={cx(
                  btn(active === item.key ? "primary" : "light", "md"),
                  "w-full text-left",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {user && (
            <div className="mt-5 flex flex-col gap-1.5 border-t border-[#eef4f9] pt-4">
              <div className="px-1 pb-1 text-[10px] font-extrabold tracking-[1.4px] text-[#7790a8] uppercase">
                Actions
              </div>
              {showNewSession && (
                <button
                  type="button"
                  className={cx(btn("primary", "md"), "w-full text-left")}
                  onClick={() => {
                    closeDrawer();
                    openNewSession();
                  }}
                >
                  ＋ New session
                </button>
              )}
              <button
                type="button"
                className={cx(btn("light", "md"), "w-full text-left")}
                onClick={() => {
                  closeDrawer();
                  openPassword();
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
          ) : (
            <button
              type="button"
              className={cx(btn("primary", "md"), "w-full")}
              onClick={() => {
                closeDrawer();
                openLogin();
              }}
            >
              Admin login
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

