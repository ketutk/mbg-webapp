"use client";

import { useState } from "react";
import Link from "next/link";
import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/format";
import { initials } from "@/lib/initials";
import { useSessionSummary, useSessionsList } from "@/lib/store";
import {
  avatar,
  btn,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  eyebrow,
  h1,
  pill,
  selectInput,
  skelCircle,
  spinner,
  sub,
} from "@/lib/ui";

export default function LeaderboardsApp() {
  const [selectedId, setSelectedId] = useState<string>("");
  const {
    data: sessionsPage,
    loading: listLoading,
    fetching: listFetching,
  } = useSessionsList({ status: "OPEN", page: 1, pageSize: 12 });

  const openSessions = sessionsPage?.sessions ?? [];
  const activeSession =
    openSessions.find((s) => s.id === selectedId) ?? openSessions[0] ?? null;
  const activeId = activeSession?.id ?? null;

  const {
    data: summary,
    loading: summaryLoading,
    fetching: summaryFetching,
  } = useSessionSummary(activeId);

  const rankedPlayers = summary
    ? [...summary.players].sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
      )
    : [];

  return (
    <>
      <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Standings</div>
          <h1 className={h1}>Leaderboards</h1>
          <div className="mt-1 text-xs text-muted">
            Player game counts ranked for each active session.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(listFetching || summaryFetching) && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]"
              aria-live="polite"
            >
              <span className={spinner} />
              Syncing…
            </span>
          )}
          <Link href="/sessions" className={btn("light")}>
            All sessions →
          </Link>
        </div>
      </section>

      {listLoading && !sessionsPage ? (
        <SkeletonRegion label="Loading leaderboards">
          <section className={card} aria-labelledby="leaderboards-title">
            <div className={cardHead}>
              <div>
                <h2 className={cardTitle} id="leaderboards-title">
                  Session leaderboard
                </h2>
                <SkeletonBar w="w-56" h="h-3" className="mt-2" />
              </div>
              <SkeletonBar w="w-44" h="h-9" className="rounded-xl" />
            </div>
            <ul className="list-none border-t border-[#eef4f9]">
              {[0, 1, 2, 3, 4].map((row) => (
                <li
                  key={row}
                  className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
                >
                  <SkeletonBar w="w-7" h="h-5" className="rounded-full" />
                  <div aria-hidden="true" className={skelCircle("size-8")} />
                  <SkeletonBar w="w-36" h="h-3.5" className="flex-1" />
                  <SkeletonBar w="w-9" h="h-7" className="rounded-[9px]" />
                </li>
              ))}
            </ul>
          </section>
        </SkeletonRegion>
      ) : openSessions.length === 0 ? (
        <section
          className={cx(card, "mx-auto mt-6 max-w-[520px] px-6 py-10 text-center")}
        >
          <div className={eyebrow}>No active sessions</div>
          <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
            No open sessions on the board
          </h2>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
            Player leaderboards appear while sessions are open on match day.
          </p>
          <Link href="/sessions" className={btn("primary")}>
            Browse sessions →
          </Link>
        </section>
      ) : (
        <section className={card} aria-labelledby="leaderboards-title">
          <div className={cx(cardHead, "flex-wrap items-center")}>
            <div>
              <h2 className={cardTitle} id="leaderboards-title">
                {activeSession?.name ?? "Session leaderboard"}
              </h2>
              <div className={sub}>
                {activeSession
                  ? `${fmtDate(activeSession.date)} · ${activeSession.playerCount} players · ${activeSession.gameCount} matches`
                  : "Games played per player"}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {openSessions.length > 1 && (
                <label className="flex items-center gap-2 text-xs font-bold text-[#5d7f9d]">
                  <span className="sr-only">Choose session</span>
                  <select
                    value={activeId ?? ""}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className={cx(selectInput, "max-w-[240px]")}
                  >
                    {openSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({fmtDate(s.date)})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {activeSession && (
                <Link
                  href={`/sessions/${activeSession.id}`}
                  className={btn("primary", "sm")}
                >
                  Open session →
                </Link>
              )}
            </div>
          </div>

          {summaryLoading && !summary ? (
            <ul className="list-none border-t border-[#eef4f9]">
              {[0, 1, 2, 3, 4].map((row) => (
                <li
                  key={row}
                  className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
                >
                  <SkeletonBar w="w-7" h="h-5" className="rounded-full" />
                  <div aria-hidden="true" className={skelCircle("size-8")} />
                  <SkeletonBar w="w-36" h="h-3.5" className="flex-1" />
                  <SkeletonBar w="w-9" h="h-7" className="rounded-[9px]" />
                </li>
              ))}
            </ul>
          ) : rankedPlayers.length === 0 ? (
            <div className={empty}>No players in this session yet.</div>
          ) : (
            <ul className="list-none border-t border-[#eef4f9]">
              {rankedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
                  >
                    <span
                      className={cx(
                        "grid h-6 min-w-7 place-items-center rounded-full px-1.5 font-display text-[11px] font-extrabold",
                        rank === 1
                          ? "bg-ok-bg text-ok"
                          : rank <= 3
                            ? "bg-[#eaf5ff] text-[#337fc4]"
                            : "bg-[#f4f7fa] text-muted",
                      )}
                    >
                      #{rank}
                    </span>
                    <span className={avatar}>{initials(player.name)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-[#254f77]">
                      {player.name}
                    </span>
                    {player.queued > 0 && (
                      <span className={pill("warn")}>
                        +{player.queued} queued
                      </span>
                    )}
                    <span className="grid h-7 min-w-9 place-items-center rounded-[9px] bg-[#eaf5ff] px-2.5 font-display text-[13px] font-extrabold text-[#337fc4]">
                      {player.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
