"use client";

import Link from "next/link";
import { SkeletonBar } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/format";
import { useSessionsList } from "@/lib/store";
import { card, cx, eyebrow, pill } from "@/lib/ui";

export function HomeLiveHub({ isOrganiser }: { isOrganiser: boolean }) {
  const { data, loading } = useSessionsList({
    status: "OPEN",
    page: 1,
    pageSize: 3,
  });

  const openSessions = data?.sessions ?? [];
  const openCount = data?.openCount ?? 0;
  const firstOpen = openSessions[0] ?? null;

  return (
    <section
      aria-label="Live club hub"
      className="mb-5 grid grid-cols-2 gap-4 max-[860px]:grid-cols-1"
    >
      {/* Card 1: Live Sessions */}
      <div className={cx(card, "flex flex-col justify-between p-5")}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={eyebrow}>Match day</span>
            {loading && !data ? (
              <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
            ) : openCount > 0 ? (
              <span
                className={cx(
                  pill("ok"),
                  "inline-flex items-center gap-1.5",
                )}
              >
                <span className="size-1.5 animate-pulse rounded-full bg-ok" />
                Live Now ({openCount})
              </span>
            ) : (
              <span className={pill("default")}>Off-court</span>
            )}
          </div>

          <h2 className="mt-2 font-display text-xl font-extrabold tracking-[-0.4px] text-[#183e6b]">
            Live Sessions
          </h2>

          {loading && !data ? (
            <div className="mt-3 space-y-2" aria-hidden="true" data-skeleton="">
              <SkeletonBar w="w-full" h="h-11" className="rounded-xl" />
              <SkeletonBar w="w-full" h="h-11" className="rounded-xl" />
            </div>
          ) : openSessions.length > 0 ? (
            <div className="mt-3 space-y-2">
              {openSessions.slice(0, 2).map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[#e3f0fb] bg-[#f7fbff] px-3.5 py-2.5 no-underline transition-colors hover:border-[#b9dbf7] hover:bg-[#eff8ff]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-[#183e6b] group-hover:text-[#337fc4]">
                      {session.name}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-muted">
                      {fmtDate(session.date)} · {session.courtCount} court
                      {session.courtCount === 1 ? "" : "s"} ·{" "}
                      {session.playerCount} players · {session.gameCount} matches
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold text-[#3c78aa] transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              No open session right now. Check the sessions directory for
              upcoming match days or organiser records.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#eef4f9] pt-3.5">
          <Link
            href="/sessions"
            className="inline-flex items-center text-xs font-extrabold text-[#3c78aa] no-underline hover:underline"
          >
            Open all sessions →
          </Link>
          {openCount > 2 && (
            <span className="text-[11px] font-bold text-muted">
              +{openCount - 2} more open
            </span>
          )}
        </div>
      </div>

      {/* Card 2: Leaderboards */}
      <div className={cx(card, "flex flex-col justify-between p-5")}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={eyebrow}>Standings</span>
            <span className={pill("default")}>Per-session wins</span>
          </div>

          <h2 className="mt-2 font-display text-xl font-extrabold tracking-[-0.4px] text-[#183e6b]">
            Leaderboards
          </h2>

          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Follow session standings counted by winning matches and fewest
            losses from recorded court scores.
          </p>

          {firstOpen && (
            <Link
              href={`/leaderboards/${firstOpen.slug}`}
              className="group mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e3f0fb] bg-[#f7fbff] px-3.5 py-2.5 no-underline transition-colors hover:border-[#b9dbf7] hover:bg-[#eff8ff]"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold tracking-[0.6px] text-[#5794c9] uppercase">
                  Active standings
                </div>
                <div className="truncate text-xs font-extrabold text-[#183e6b] group-hover:text-[#337fc4]">
                  {firstOpen.name}
                </div>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-[#3c78aa] transition-transform group-hover:translate-x-0.5">
                Standings →
              </span>
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef4f9] pt-3.5">
          <Link
            href="/leaderboards"
            className="inline-flex items-center text-xs font-extrabold text-[#3c78aa] no-underline hover:underline"
          >
            View leaderboards →
          </Link>
          {isOrganiser && (
            <Link
              href="/treasury"
              className="inline-flex items-center text-xs font-extrabold text-ok no-underline hover:underline"
            >
              Club treasury →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
