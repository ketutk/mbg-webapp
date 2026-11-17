"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { initials } from "@/lib/initials";
import { useSessionSummary } from "@/lib/store";
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
  spinner,
  sub,
} from "@/lib/ui";
import { SessionLeaderboardSkeleton } from "./SessionLeaderboardSkeleton";

export default function SessionLeaderboardApp() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { data: summary, error, loading, fetching } = useSessionSummary(
    sessionId ?? null,
  );

  if (!sessionId || loading) {
    return <SessionLeaderboardSkeleton />;
  }

  if (error || !summary) {
    return (
      <section
        className={cx(card, "mx-auto mt-10 max-w-[480px] p-8 text-center")}
      >
        <div className={eyebrow}>Leaderboard unavailable</div>
        <h1 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
          {error instanceof Error ? error.message : "Session not found"}
        </h1>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
          This session may be closed to public visitors or removed by an
          organiser.
        </p>
        <Link href="/leaderboards" className={btn("primary")}>
          ← Back to leaderboards
        </Link>
      </section>
    );
  }

  const rankedPlayers = [...summary.players].sort(
    (a, b) =>
      b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name),
  );

  const totalWinsRecorded = rankedPlayers.reduce((sum, p) => sum + p.wins, 0);

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
          <div className="mt-1 text-xs text-muted">
            Session leaderboard · ranked by total winning matches (tie-breaker:
            fewest losses)
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fetching && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]"
              aria-live="polite"
            >
              <span className={spinner} />
              Syncing…
            </span>
          )}
          <Link href={`/sessions/${summary.id}`} className={btn("primary")}>
            View session →
          </Link>
          <Link href="/leaderboards" className={btn("light")}>
            ← All leaderboards
          </Link>
        </div>
      </section>

      <section className={card} aria-labelledby="session-leaderboard-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="session-leaderboard-title">
              Player rankings
            </h2>
            <div className={sub}>
              {totalWinsRecorded === 0
                ? "Finish on-court matches with final scores to record wins."
                : "Sorted by most wins, then fewest losses, then alphabetically."}
            </div>
          </div>
          <span className={pill("default")}>
            {rankedPlayers.length} player
            {rankedPlayers.length === 1 ? "" : "s"}
          </span>
        </div>

        {rankedPlayers.length === 0 ? (
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
                      "grid h-7 min-w-8 place-items-center rounded-full px-2 font-display text-xs font-extrabold",
                      rank === 1 && player.wins > 0
                        ? "bg-ok-bg text-ok"
                        : rank <= 3 && player.wins > 0
                          ? "bg-[#eaf5ff] text-[#337fc4]"
                          : "bg-[#f4f7fa] text-muted",
                    )}
                  >
                    #{rank}
                  </span>

                  <span className={avatar}>{initials(player.name)}</span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-extrabold text-[#254f77]">
                      {player.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted">
                      <span>{player.count} played</span>
                      {player.queued > 0 && (
                        <span className="text-warn">+{player.queued} queued</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cx(
                        "grid h-7 min-w-[46px] place-items-center rounded-[9px] px-2.5 font-display text-xs font-extrabold",
                        player.wins > 0
                          ? "bg-ok-bg text-ok"
                          : "bg-[#f4f7fa] text-muted",
                      )}
                      title="Winning matches"
                    >
                      {player.wins} W
                    </span>
                    <span
                      className={cx(
                        "grid h-7 min-w-[42px] place-items-center rounded-[9px] px-2 font-display text-xs font-extrabold",
                        player.losses > 0
                          ? "bg-[#fde7e5] text-[#b5524f]"
                          : "bg-[#f4f7fa] text-muted",
                      )}
                      title="Losses"
                    >
                      {player.losses} L
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
