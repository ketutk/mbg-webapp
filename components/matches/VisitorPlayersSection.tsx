"use client";

import { initials } from "@/lib/initials";
import { fairnessGap } from "@/lib/match";
import type { SessionSummary } from "@/lib/types";
import { avatar, card, cardHead, cardTitle, cx, empty, pill, sub } from "@/lib/ui";

export function VisitorPlayersSection({
  players,
}: {
  players: SessionSummary["players"];
}) {
  const sortedPlayers = [...players].sort(
    (a, b) => a.count - b.count || a.name.localeCompare(b.name),
  );
  const { min, max } = fairnessGap(players);

  return (
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
          {players.length} player{players.length === 1 ? "" : "s"}
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
  );
}
