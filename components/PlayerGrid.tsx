"use client";

import { addGame, clearGames, removeGame, togglePlayed } from "@/lib/store";
import { fairnessGap, getStats } from "@/lib/match";
import {
  avatar,
  btn,
  card,
  cardFoot,
  cardHead,
  cardTitle,
  cx,
  empty,
  linkBtn,
  pill,
  sub,
} from "@/lib/ui";
import type { Session } from "@/lib/types";

export function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z\s]/g, " ") // Replace non-alphabet/non-space characters with a space
    .trim()
    .split(/\s+/)
    .filter(Boolean)              // Remove empty strings
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const headCell =
  "border-b border-[#f0f5f9] bg-[#fafdff] py-2.5 text-[10px] font-extrabold text-[#5d7f9d]";
const headGameCell = cx(headCell, "group relative min-w-14 px-1.5 text-center");
const stickyCol = "sticky left-0 min-w-[190px] text-left max-[860px]:min-w-[150px]";
const rowBg = (isNext: boolean) =>
  isNext ? "bg-[#f1f9ff]" : "bg-white group-hover/row:bg-[#f9fcff]";

export function PlayerGrid({
  session,
  nextUp,
}: {
  session: Session;
  nextUp: Set<string>;
}) {
  const stats = getStats(session);
  const { min, max } = fairnessGap(stats);
  const countOf = new Map(stats.map((s) => [s.player.id, s.count]));

  return (
    <section className={card} aria-labelledby="grid-title">
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="grid-title">
            Games played
          </h2>
          <div className={sub}>
            Tick a box for every game a player has played. Fill it in by hand any time.
          </div>
        </div>
        <button
          id="add-game"
          className={btn("primary", "sm")}
          onClick={() => addGame(session.id)}
        >
          ＋ Add game
        </button>
      </div>

      {session.players.length === 0 ? (
        <div className={empty}>No players yet. Use “Edit players” to add your roster.</div>
      ) : (
        <div className="overflow-x-auto border-t border-[#eef4f9]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className={cx(
                    headCell,
                    stickyCol,
                    "z-2 pr-1.5 pl-[22px] max-[860px]:pl-3.5",
                  )}
                >
                  Player
                </th>
                {session.games.map((g, i) => (
                  <th key={g.id} className={headGameCell}>
                    <div>G{i + 1}</div>
                    <small className="mt-0.5 block font-semibold opacity-70">
                      {g.playerIds.length}/{session.players.length}
                    </small>
                    <button
                      className="absolute top-[3px] right-[3px] size-4 rounded-full bg-transparent text-[13px] leading-none text-[#a7b9ca] opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#fde7e5] hover:text-[#b5524f] focus-visible:opacity-100 [@media(hover:none)]:opacity-60"
                      aria-label={`Remove game ${i + 1}`}
                      title="Remove this game"
                      onClick={() => removeGame(session.id, g.id)}
                    >
                      ×
                    </button>
                  </th>
                ))}
                {session.games.length === 0 && (
                  <th className={cx(headGameCell, "font-semibold whitespace-nowrap text-[#9db0c3]")}>
                    No games yet
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {session.players.map((p) => {
                const count = countOf.get(p.id) ?? 0;
                const behind = max > min && count === min;
                const isNext = nextUp.has(p.id);
                const bodyCell = cx(
                  "min-w-14 border-b border-[#f0f5f9] py-[11px] text-center",
                  rowBg(isNext),
                );
                return (
                  <tr key={p.id} className="group/row">
                    <th
                      scope="row"
                      className={cx(
                        stickyCol,
                        "z-1 border-b border-[#f0f5f9] p-0 font-normal",
                        rowBg(isNext),
                      )}
                    >
                      <div className="flex items-center gap-2.5 py-2.5 pr-2.5 pl-[22px] max-[860px]:gap-2 max-[860px]:pl-3.5">
                        <span className={avatar}>{initials(p.name)}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-[3px] truncate text-[13px] font-extrabold text-[#254f77]">
                          {p.name}
                          {isNext && <em className={pill("next")}>Next up</em>}
                        </span>
                        <span
                          className={cx(
                            "grid h-7 min-w-7 place-items-center rounded-[9px] font-display text-[13px] font-extrabold",
                            behind ? "bg-warn-bg text-warn" : "bg-[#eaf5ff] text-[#337fc4]",
                          )}
                          title={`${count} game${count === 1 ? "" : "s"} played`}
                        >
                          {count}
                        </span>
                      </div>
                    </th>
                    {session.games.map((g, i) => (
                      <td key={g.id} className={bodyCell}>
                        <input
                          type="checkbox"
                          className="size-5 cursor-pointer accent-[#5da5e4]"
                          aria-label={`${p.name} played game ${i + 1}`}
                          checked={g.playerIds.includes(p.id)}
                          onChange={() => togglePlayed(session.id, g.id, p.id)}
                        />
                      </td>
                    ))}
                    {session.games.length === 0 && <td className={bodyCell} />}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={cardFoot}>
        <span>
          {session.players.length} player{session.players.length === 1 ? "" : "s"} ·{" "}
          {session.games.length} game{session.games.length === 1 ? "" : "s"}
        </span>
        <button
          className={linkBtn}
          disabled={!session.games.length}
          onClick={() => {
            if (window.confirm("Remove all games from this session?")) clearGames(session.id);
          }}
        >
          Clear all games
        </button>
      </div>
    </section>
  );
}
