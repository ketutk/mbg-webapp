"use client";

import { addGame } from "@/lib/store";
import { fairnessGap, getStats, type Recommendation } from "@/lib/match";
import {
  avatarOnCourt,
  btn,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  emptySmall,
  pill,
  sub,
} from "@/lib/ui";
import { initials } from "./PlayerGrid";
import type { Player, Session } from "@/lib/types";

function Slot({ p, count }: { p: Player; count: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#ffffff33] bg-[#ffffff26] px-2.5 py-2 backdrop-blur-[6px]">
      <span className={avatarOnCourt}>{initials(p.name)}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{p.name}</span>
      <span className="text-right font-display text-[13px] font-extrabold">
        {count} <small className="font-sans text-[9px] font-semibold opacity-85">played</small>
      </span>
    </div>
  );
}

const teamLabel = "text-[9px] font-extrabold tracking-[1.4px] uppercase opacity-85";

export function NextMatch({
  session,
  rec,
  onShuffle,
  onStarted,
}: {
  session: Session;
  rec: Recommendation | null;
  onShuffle: () => void;
  onStarted: () => void;
}) {
  const stats = getStats(session);
  const countOf = new Map(stats.map((s) => [s.player.id, s.count]));
  const { min, max, gap } = fairnessGap(stats);

  function start() {
    if (!rec) return;
    const [t1, t2] = rec.teams;
    addGame(
      session.id,
      rec.players.map((p) => p.id),
      [
        [t1[0].id, t1[1].id],
        [t2[0].id, t2[1].id],
      ],
    );
    onStarted();
  }

  const slot = (p: Player) => <Slot key={p.id} p={p} count={countOf.get(p.id) ?? 0} />;

  return (
    <section
      className={cx(card, "bg-[linear-gradient(180deg,#fff,#fafdff)]")}
      aria-labelledby="rec-title"
    >
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="rec-title">
            Next match
          </h2>
          <div className={sub}>
            {rec?.level
              ? "Everyone is level — the longest rest goes first."
              : "Players with the fewest games go first."}
          </div>
        </div>
        <span className={pill(gap === 0 ? "ok" : "warn")}>
          {session.players.length === 0
            ? "—"
            : gap === 0
              ? "All level"
              : `Gap ${gap} · ${min}–${max}`}
        </span>
      </div>

      {rec ? (
        <>
          <div className="mx-[18px] grid gap-2 rounded-2xl bg-[linear-gradient(145deg,#5ca5e3,#7ab8ec)] p-3.5 text-white shadow-[0_11px_26px_#589bce27]">
            <div className="grid gap-1.5">
              <div className={teamLabel}>Team A</div>
              {rec.teams[0].map(slot)}
            </div>
            <div className="relative text-center font-display text-[11px] font-extrabold tracking-[3px] opacity-90">
              VS
            </div>
            <div className="grid gap-1.5">
              <div className={teamLabel}>Team B</div>
              {rec.teams[1].map(slot)}
            </div>
          </div>

          <div className="flex gap-2 px-[18px] pt-3.5 pb-1">
            <button id="shuffle" className={btn("light")} onClick={onShuffle}>
              ⟳ Shuffle
            </button>
            <button id="start-match" className={cx(btn("primary"), "flex-1")} onClick={start}>
              Start match · tick 4 players
            </button>
          </div>

          <div className="px-[22px] pt-4 pb-2 text-[10px] font-extrabold tracking-[0.8px] text-[#7790a8] uppercase">
            Waiting · up after this
          </div>
          {rec.queue.length ? (
            <ol className="max-h-[280px] list-none overflow-auto pb-2">
              {rec.queue.map((s, i) => (
                <li
                  key={s.player.id}
                  className="flex items-center gap-2.5 border-t border-[#f0f5f9] px-[22px] py-[9px] max-[860px]:px-[15px]"
                >
                  <span className="w-5 font-display text-[11px] font-extrabold text-[#9db0c3]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#315d84]">
                    {s.player.name}
                  </span>
                  <span className={pill(s.count === min && max > min ? "warn" : "default")}>
                    {s.count} played
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className={emptySmall}>Everyone is on court.</div>
          )}
        </>
      ) : (
        <div className={empty}>
          {session.players.length === 0
            ? "Add players to get a match recommendation."
            : "You need at least 4 players for a doubles recommendation."}
        </div>
      )}
    </section>
  );
}
