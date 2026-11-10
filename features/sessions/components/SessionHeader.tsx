"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/date";
import type { Session } from "../types";
import { Button, Pill } from "@/components/ui";
import { eyebrow, h1, spinner } from "@/lib/ui";

export interface SessionHeaderProps {
  session: Session;
  isSuperadmin: boolean;
  togglingStatus: boolean;
  deletingSession: boolean;
  onToggleStatus: () => void;
  onOpenHistory: () => void;
  onOpenRoster: () => void;
  onOpenSettings: () => void;
  onConfirmDelete: () => void;
}

export function SessionHeader({
  session,
  isSuperadmin,
  togglingStatus,
  deletingSession,
  onToggleStatus,
  onOpenHistory,
  onOpenRoster,
  onOpenSettings,
  onConfirmDelete,
}: SessionHeaderProps) {
  return (
    <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={eyebrow}>{fmtDate(session.date)}</span>
          <Pill variant={session.status === "OPEN" ? "ok" : "default"}>
            {session.status === "OPEN" ? "Open" : "Closed (Organisers only)"}
          </Pill>
        </div>
        <h1 className={h1}>{session.name}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/">
          <Button variant="light">← All sessions</Button>
        </Link>

        <Button
          variant="light"
          disabled={togglingStatus}
          onClick={onToggleStatus}
        >
          {togglingStatus ? (
            <>
              <span className={spinner} />
              <span className="ml-1.5">Updating…</span>
            </>
          ) : session.status === "OPEN" ? (
            "Close session"
          ) : (
            "Reopen session"
          )}
        </Button>

        <Button
          id="match-history"
          variant="light"
          onClick={onOpenHistory}
        >
          History · {session.games.length}
        </Button>

        {isSuperadmin && (
          <>
            <Button
              id="edit-players"
              variant="light"
              onClick={onOpenRoster}
            >
              Edit players
            </Button>

            <Button
              id="session-settings"
              variant="light"
              onClick={onOpenSettings}
            >
              Session settings
            </Button>

            <Button
              variant="danger"
              disabled={deletingSession}
              onClick={onConfirmDelete}
            >
              {deletingSession ? (
                <>
                  <span className={spinner} />
                  <span className="ml-1.5">Deleting…</span>
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
