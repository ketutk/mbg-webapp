"use client";

import type { Game, Player } from "@/lib/types";
import { initials } from "@/components/ui";
import {
  avatar,
  cx,
  lockedHead,
  pill,
  spinner,
} from "@/lib/ui";

export const headCell =
  "border-b border-[#f0f5f9] bg-[#fafdff] py-2.5 text-[10px] font-extrabold text-[#5d7f9d]";
export const headGameCell = cx(headCell, "group relative min-w-16 px-1.5 text-center");
export const stickyCol =
  "sticky left-0 min-w-[190px] text-left max-[860px]:min-w-[150px]";
export const rowBg = (isNext: boolean) =>
  isNext ? "bg-[#f1f9ff]" : "bg-white group-hover/row:bg-[#f9fcff]";

export function PlayerGridHeaderCell({
  game,
  index,
  totalPlayers,
  isLocking,
  isRemoving,
  onLock,
  onRemove,
}: {
  game: Game;
  index: number;
  totalPlayers: number;
  isLocking: boolean;
  isRemoving: boolean;
  onLock: () => void;
  onRemove: () => void;
}) {
  const isQueued = game.status === "QUEUED";
  return (
    <th
      className={cx(
        headGameCell,
        game.locked && lockedHead,
        isQueued && "bg-[#fffaf3]",
        isRemoving && "opacity-50",
      )}
    >
      <div className="flex items-center justify-center gap-1">
        <span>G{index + 1}</span>
        <button
          type="button"
          className="rounded px-0.5 text-[11px] leading-none hover:bg-[#e3eff9]"
          aria-label={game.locked ? `Unlock game ${index + 1}` : `Lock game ${index + 1}`}
          title={game.locked ? "Locked — click to unlock and edit ticks" : "Unlocked — click to lock"}
          disabled={isLocking || isRemoving}
          onClick={onLock}
        >
          {isLocking ? <span className={cx(spinner, "size-2.5")} /> : game.locked ? "🔒" : "🔓"}
        </button>
      </div>
      <small className="mt-0.5 block font-semibold opacity-70">
        {game.playerIds.length}/{totalPlayers}
      </small>
      {isQueued && (
        <span className={cx(pill("warn"), "mt-1 px-1.5 py-0.5 text-[9px]")}>
          Queued
        </span>
      )}
      {game.status === "ON_COURT" && game.courtNumber != null && (
        <span className={cx(pill("ok"), "mt-1 px-1.5 py-0.5 text-[9px]")}>
          C{game.courtNumber}
        </span>
      )}
      <button
        type="button"
        className="absolute top-[3px] right-[3px] size-4 rounded-full bg-transparent text-[13px] leading-none text-[#a7b9ca] opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#fde7e5] hover:text-[#b5524f] focus-visible:opacity-100 [@media(hover:none)]:opacity-60"
        aria-label={`Remove game ${index + 1}`}
        title="Remove this game"
        disabled={isRemoving}
        onClick={onRemove}
      >
        {isRemoving ? <span className={cx(spinner, "size-2.5")} /> : "×"}
      </button>
    </th>
  );
}

export function PlayerGridRow({
  player,
  games,
  count,
  queued,
  behind,
  isNext,
  pendingTicks,
  onTick,
}: {
  player: Player;
  games: Game[];
  count: number;
  queued: number;
  behind: boolean;
  isNext: boolean;
  pendingTicks: Set<string>;
  onTick: (gameId: string, playerId: string, checked: boolean) => void;
}) {
  return (
    <tr className="group/row">
      <th
        scope="row"
        className={cx(stickyCol, "z-1 border-b border-[#f0f5f9] p-0 font-normal", rowBg(isNext))}
      >
        <div className="flex items-center gap-2.5 py-2.5 pr-2.5 pl-[22px] max-[860px]:gap-2 max-[860px]:pl-3.5">
          <span className={avatar}>{initials(player.name)}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px] truncate text-[13px] font-extrabold text-[#254f77]">
            {player.name}
            <span className="flex flex-wrap items-center gap-1">
              {isNext && <em className={pill("next")}>Next up</em>}
              {queued > 0 && (
                <em className={cx(pill("warn"), "px-1.5 py-0.5 text-[9px]")}>
                  +{queued} queued
                </em>
              )}
            </span>
          </span>
          <span
            className={cx(
              "grid h-7 min-w-7 place-items-center rounded-[9px] font-display text-[13px] font-extrabold",
              behind ? "bg-warn-bg text-warn" : "bg-[#eaf5ff] text-[#337fc4]",
            )}
            title={`${count} game${count === 1 ? "" : "s"} played${queued > 0 ? ` (${queued} queued)` : ""}`}
          >
            {count}
          </span>
        </div>
      </th>
      {games.map((g, i) => {
        const isQueued = g.status === "QUEUED";
        const checked = g.playerIds.includes(player.id);
        const isPending = pendingTicks.has(`${g.id}:${player.id}`);
        const bodyCell = cx(
          "min-w-16 border-b border-[#f0f5f9] py-[11px] text-center",
          isQueued ? "bg-[#fffcf7]" : g.locked ? "bg-[#f9fbfd]" : rowBg(isNext),
        );
        return (
          <td key={g.id} className={bodyCell}>
            <input
              type="checkbox"
              className={cx(
                "size-5 cursor-pointer accent-[#5da5e4] transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                isPending && "animate-pulse opacity-60",
              )}
              aria-label={`${player.name} played game ${i + 1}`}
              checked={checked}
              disabled={g.locked || isPending}
              onChange={(e) => onTick(g.id, player.id, e.target.checked)}
            />
          </td>
        );
      })}
      {games.length === 0 && (
        <td className={cx("min-w-16 border-b border-[#f0f5f9] py-[11px] text-center", rowBg(isNext))} />
      )}
    </tr>
  );
}
