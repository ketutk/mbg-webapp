"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { Session } from "@/lib/types";
import { btn, cx, eyebrow, h1, pill, spinner } from "@/lib/ui";

export function SessionHeaderBar({
  session,
  isSuperadmin,
  togglingStatus,
  deletingSession,
  onBackToList,
  onShowHistory,
  onEditRoster,
  onEditSettings,
  onToggleStatus,
  onRequestDelete,
}: {
  session: Session;
  isSuperadmin: boolean;
  togglingStatus: boolean;
  deletingSession: boolean;
  onBackToList: () => void;
  onShowHistory: () => void;
  onEditRoster: () => void;
  onEditSettings: () => void;
  onToggleStatus: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={eyebrow}>{fmtDate(session.date)}</span>
          <span
            className={pill(session.status === "OPEN" ? "ok" : "default")}
          >
            {session.status === "OPEN" ? "Open" : "Closed (Organisers only)"}
          </span>
        </div>
        <h1 className={h1}>{session.name}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn("light")} onClick={onBackToList}>
          ← All sessions
        </button>
        <Link href={`/leaderboards/${session.id}`} className={btn("light")}>
          Leaderboard
        </Link>
        <button
          type="button"
          className={btn("light")}
          disabled={togglingStatus}
          onClick={onToggleStatus}
        >
          {togglingStatus ? (
            <>
              <span className={cx(spinner, "mr-1.5")} />
              Updating…
            </>
          ) : session.status === "OPEN" ? (
            "Close session"
          ) : (
            "Reopen session"
          )}
        </button>
        <button
          id="match-history"
          className={btn("light")}
          onClick={onShowHistory}
        >
          History · {session.games.length}
        </button>
        <button
          id="edit-players"
          className={btn("light")}
          onClick={onEditRoster}
        >
          Edit players
        </button>
        <button
          id="session-settings"
          className={btn("light")}
          onClick={onEditSettings}
        >
          Session settings
        </button>
        {isSuperadmin && (
          <button
            className={btn("danger")}
            disabled={deletingSession}
            onClick={onRequestDelete}
          >
            {deletingSession ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        )}
      </div>
    </section>
  );
}

