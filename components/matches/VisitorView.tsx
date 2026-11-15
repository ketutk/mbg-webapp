"use client";

import { fmtDate } from "@/lib/format";
import { selectSession, useSessionSummary } from "@/lib/store";
import type { PublicGame } from "@/lib/types";
import {
  btn,
  card,
  cardTitle,
  cx,
  eyebrow,
  h1,
  pill,
  sub,
} from "@/lib/ui";
import { CourtCard } from "./CourtCard";
import { VisitorPlayersSection } from "./VisitorPlayersSection";
import { VisitorQueueSection } from "./VisitorQueueSection";
import { VisitorViewSkeleton } from "./VisitorViewSkeleton";

export function VisitorView({
  sessionId,
  onBackToList,
}: {
  sessionId: string;
  onBackToList: () => void;
}) {
  const { data: summary, error, loading } = useSessionSummary(sessionId);

  if (loading) {
    return (
      <VisitorViewSkeleton
        onBackToList={() => {
          selectSession(null);
          onBackToList();
        }}
      />
    );
  }

  if (error || !summary) {
    return (
      <section className={cx(card, "mx-auto mt-10 max-w-[480px] p-8 text-center")}>
        <div className={eyebrow}>Session unavailable</div>
        <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
          {error instanceof Error ? error.message : "Session not found"}
        </h2>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
          This session may have been closed or removed by an organiser.
        </p>
        <button
          type="button"
          className={btn("primary")}
          onClick={() => {
            selectSession(null);
            onBackToList();
          }}
        >
          ← Back to all sessions
        </button>
      </section>
    );
  }

  const nameOf = new Map(summary.players.map((p) => [p.id, p.name]));

  const byCourt = new Map<number, PublicGame>();
  for (const c of summary.courts) {
    if (c.courtNumber != null) byCourt.set(c.courtNumber, c);
  }
  const courtList = Array.from(
    { length: Math.max(1, summary.courtCount) },
    (_, i) => ({
      courtNumber: i + 1,
      game: byCourt.get(i + 1) ?? null,
    }),
  );

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={eyebrow}>{fmtDate(summary.date)}</span>
            <span
              className={pill(summary.status === "OPEN" ? "ok" : "default")}
            >
              {summary.status === "OPEN" ? "Open" : "Closed"}
            </span>
          </div>
          <h1 className={h1}>{summary.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btn("light")}
            onClick={() => {
              selectSession(null);
              onBackToList();
            }}
          >
            ← All sessions
          </button>
        </div>
      </section>

      <section className="mb-5" aria-labelledby="visitor-courts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className={cardTitle} id="visitor-courts-title">
              Courts
            </h2>
            <div className={sub}>Live matches currently on court.</div>
          </div>
          <span className={pill(summary.courts.length > 0 ? "ok" : "default")}>
            {summary.courts.length}/{courtList.length} occupied
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 max-[860px]:grid-cols-1">
          {courtList.map(({ courtNumber, game }) => (
            <CourtCard
              key={courtNumber}
              courtNumber={courtNumber}
              game={game}
              nameOf={nameOf}
              readOnly
            />
          ))}
        </div>
      </section>

      <VisitorQueueSection queue={summary.queue} nameOf={nameOf} />

      <VisitorPlayersSection players={summary.players} />
    </>
  );
}
