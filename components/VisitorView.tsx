"use client";

import { fmtDate } from "@/lib/format";
import { fairnessGap } from "@/lib/match";
import { selectSession, useSessionSummary } from "@/lib/store";
import type { PublicGame, SessionListItem } from "@/lib/types";
import { CourtCard } from "./CourtCard";
import { initials } from "./PlayerGrid";
import {
  avatar,
  card,
  cardHead,
  cardTitle,
  chip,
  cx,
  empty,
  emptySmall,
  eyebrow,
  h1,
  pill,
  selectInput,
  shimmerCard,
  sub,
} from "@/lib/ui";

export function VisitorView({
  sessionId,
  sessions,
}: {
  sessionId: string;
  sessions: SessionListItem[];
}) {
  const { data: summary, loading } = useSessionSummary(sessionId);

  if (loading || !summary) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  const nameOf = new Map(summary.players.map((p) => [p.id, p.name]));
  const playerName = (id: string) => nameOf.get(id) ?? "Player";

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

  const sortedPlayers = [...summary.players].sort(
    (a, b) => a.count - b.count || a.name.localeCompare(b.name),
  );
  const { min, max } = fairnessGap(summary.players);

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>{fmtDate(summary.date)}</div>
          <h1 className={h1}>{summary.name}</h1>
        </div>
        {sessions.length > 1 && (
          <label>
            <span className="sr-only">Switch session</span>
            <select
              id="visitor-session-select"
              className={selectInput}
              value={summary.id}
              onChange={(e) => selectSession(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {fmtDate(s.date)}
                </option>
              ))}
            </select>
          </label>
        )}
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

      <section className={cx(card, "mb-5")} aria-labelledby="visitor-queue-title">
        <div className={cardHead}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cardTitle} id="visitor-queue-title">
                Queue · Next matches
              </h2>
              <span className={pill(summary.queue.length ? "warn" : "default")}>
                {summary.queue.length} queued
              </span>
            </div>
            <div className={sub}>
              Players in the queue are next up when a court finishes.
            </div>
          </div>
        </div>

        {summary.queue.length === 0 ? (
          <div className={emptySmall}>No matches queued right now.</div>
        ) : (
          <ol className="list-none border-t border-[#eef4f9]">
            {summary.queue.map((g, i) => {
              const teams =
                g.teams ??
                (g.playerIds.length === 4
                  ? ([
                      [g.playerIds[0], g.playerIds[1]],
                      [g.playerIds[2], g.playerIds[3]],
                    ] as const)
                  : undefined);
              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-2.5 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
                >
                  <span className="grid size-6 place-items-center rounded-lg bg-[#eaf5ff] font-display text-xs font-extrabold text-[#337fc4]">
                    {i + 1}
                  </span>
                  <span className={pill("warn")}>Queued</span>
                  {teams ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex gap-1">
                        {teams[0].map((id) => (
                          <span key={id} className={chip}>
                            {playerName(id)}
                          </span>
                        ))}
                      </span>
                      <span className="px-1 font-display text-[10px] font-extrabold tracking-[2px] text-[#9db0c3]">
                        VS
                      </span>
                      <span className="flex gap-1">
                        {teams[1].map((id) => (
                          <span key={id} className={chip}>
                            {playerName(id)}
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.playerIds.map((id) => (
                        <span key={id} className={chip}>
                          {playerName(id)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className={card} aria-labelledby="visitor-players-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="visitor-players-title">
              Games played
            </h2>
            <div className={sub}>
              Games played per player in this session (including queued matches).
            </div>
          </div>
          <span className={pill("default")}>
            {summary.players.length} player{summary.players.length === 1 ? "" : "s"}
          </span>
        </div>

        {sortedPlayers.length === 0 ? (
          <div className={empty}>No players in this session yet.</div>
        ) : (
          <ul className="list-none border-t border-[#eef4f9]">
            {sortedPlayers.map((p) => {
              const behind = max > min && p.count === min;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
                >
                  <span className={avatar}>{initials(p.name)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-[#254f77]">
                    {p.name}
                  </span>
                  {p.queued > 0 && (
                    <span className={pill("warn")}>+{p.queued} queued</span>
                  )}
                  <span
                    className={cx(
                      "grid h-7 min-w-7 place-items-center rounded-[9px] px-2 font-display text-[13px] font-extrabold",
                      behind
                        ? "bg-warn-bg text-warn"
                        : "bg-[#eaf5ff] text-[#337fc4]",
                    )}
                  >
                    {p.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

