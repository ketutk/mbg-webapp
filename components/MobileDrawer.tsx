"use client";

import Link from "next/link";
import type { AuthUser } from "@/lib/types";
import { initials } from "@/components/ui";
import { avatar, btn, cx, pill, spinner } from "@/lib/ui";

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
          <i className="size-2 rounded-full bg-[#53b8a3]" />
          <span>Live</span>
        </>
      )}
    </span>
  );
}

export interface MobileDrawerProps {
  active: "matches" | "treasury" | "admins";
  user: AuthUser | null;
  isSuperadmin: boolean;
  isFetching: number;
  loggingOut: boolean;
  onClose: () => void;
  onNewSession?: () => void;
  onChangePass: () => void;
  onLogout: () => void;
  onLogin: () => void;
}

export function MobileDrawer({
  active,
  user,
  isSuperadmin,
  isFetching,
  loggingOut,
  onClose,
  onNewSession,
  onChangePass,
  onLogout,
  onLogin,
}: MobileDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-30 hidden animate-fade bg-[#23466ac9] max-[860px]:block"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(300px,84vw)] flex-col justify-between border-l border-[#e3eff9] bg-white p-5 shadow-[0_24px_80px_#123b6133]">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-[#eef4f9] pb-4">
            <LiveSyncIndicator isFetching={isFetching} />
            <button
              type="button"
              className="grid size-8 place-items-center rounded-xl border border-[#deedf9] bg-[#f2f8fe] text-sm font-extrabold text-[#3c78aa]"
              aria-label="Close navigation menu"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {user && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-[#e3f0fb] bg-[#f6fbff] p-3">
              <span className={avatar}>{initials(user.username)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-extrabold text-[#204a74]">{user.username}</div>
                <div className="mt-0.5">
                  <span className={pill(isSuperadmin ? "ok" : "default")}>{user.role}</span>
                </div>
              </div>
            </div>
          )}

          <nav className="mt-4 flex flex-col gap-1.5" aria-label="Mobile navigation">
            <div className="px-1 pb-1 text-[10px] font-extrabold tracking-[1.4px] text-[#7790a8] uppercase">
              Navigation
            </div>
            <Link
              href="/"
              onClick={onClose}
              className={cx(btn(active === "matches" ? "primary" : "light", "md"), "w-full text-left")}
            >
              Matches
            </Link>
            <Link
              href="/treasury"
              onClick={onClose}
              className={cx(btn(active === "treasury" ? "primary" : "light", "md"), "w-full text-left")}
            >
              Treasury
            </Link>
            {isSuperadmin && (
              <Link
                href="/admins"
                onClick={onClose}
                className={cx(btn(active === "admins" ? "primary" : "light", "md"), "w-full text-left")}
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
                    onClose();
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
                  onClose();
                  onChangePass();
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
                onClose();
                onLogin();
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

