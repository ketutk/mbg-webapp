"use client";

import { useState } from "react";
import {
  clearGames,
  removeGame,
  setGameLocked,
  setPlayed,
} from "@/lib/store";
import { fairnessGap, getStats } from "@/lib/match";
import { initials } from "@/lib/initials";
import type { Session } from "@/lib/types";
import { ConfirmDialog } from "./Dialog";
import {
  avatar,
  card,
  cardFoot,
  cardHead,
  cardTitle,
  cx,
  empty,
  linkBtn,
  lockedHead,
  pill,
  spinner,
  sub,
} from "@/lib/ui";

const headCell =
  "border-b border-[#f0f5f9] bg-[#fafdff] py-2.5 text-[10px] font-extrabold text-[#5d7f9d]";
const headGameCell = cx(headCell, "group relative min-w-16 px-1.5 text-center");
const stickyCol =
  "sticky left-0 min-w-[190px] text-left max-[860px]:min-w-[150px]";
const rowBg = (isNext: boolean) =>
  isNext ? "bg-[#f1f9ff]" : "bg-white group-hover/row:bg-[#f9fcff]";

export function PlayerGrid({
  session,
  nextUp,
  isSuperadmin,
  onToast,
}: {
  session: Session;
  nextUp: Set<string>;
  isSuperadmin?: boolean;
  onToast?: (msg: string) => void;
}) {
  const [pendingTicks, setPendingTicks] = useState<Set<string>>(() => new Set());
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmRemoveGame, setConfirmRemoveGame] = useState<{
    gameId: string;
    n: number;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const stats = getStats(session);
  const { min, max } = fairnessGap(stats);
  const statOf = new Map(stats.map((s) => [s.player.id, s]));

  async function handleTick(gameId: string, playerId: string, checked: boolean) {
    const cellKey = `${gameId}:${playerId}`;
    setPendingTicks((prev) => new Set(prev).add(cellKey));
    try {
      await setPlayed(session.id, gameId, playerId, checked);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not update tick");
    } finally {
      setPendingTicks((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  }

  async function handleLock(gameId: string, locked: boolean, n: number) {
    setLockingId(gameId);
    try {
      await setGameLocked(session.id, gameId, locked);
      onToast?.(
        locked ? `Game ${n} locked` : `Game ${n} unlocked — you can edit ticks now`,
      );
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not update lock");
    } finally {
      setLockingId(null);
    }
  }

  async function handleConfirmRemoveGame() {
    if (!confirmRemoveGame) return;
    const { gameId, n } = confirmRemoveGame;
    setRemovingId(gameId);
    try {
      await removeGame(session.id, gameId);
      setConfirmRemoveGame(null);
      onToast?.(`Game ${n} removed`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not remove game");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleConfirmClearAll() {
    setClearing(true);
    try {
      await clearGames(session.id);
      setConfirmClearAll(false);
      onToast?.("All games cleared");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not clear games");
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className={card} aria-labelledby="grid-title">
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="grid-title">
            Games played
          </h2>
          <div className={sub}>
            Columns are created when a match is assigned to a court or queue, and lock automatically at 4 players. Unlock a column to adjust ticks by hand.
          </div>
        </div>
      </div>

      {session.players.length === 0 ? (
        <div className={empty}>
          {isSuperadmin
            ? "No players yet. Use “Edit players” to add your roster."
            : "No players in this session yet."}
        </div>
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
                {session.games.map((g, i) => {
                  const isQueued = g.status === "QUEUED";
                  const isLocking = lockingId === g.id;
                  const isRemoving = removingId === g.id;
                  return (
                    <th
                      key={g.id}
                      className={cx(
                        headGameCell,
                        g.locked && lockedHead,
                        isQueued && "bg-[#fffaf3]",
                        isRemoving && "opacity-50",
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>G{i + 1}</span>
                        <button
                          type="button"
                          className="rounded px-0.5 text-[11px] leading-none hover:bg-[#e3eff9]"
                          aria-label={
                            g.locked
                              ? `Unlock game ${i + 1}`
                              : `Lock game ${i + 1}`
                          }
                          title={
                            g.locked
                              ? "Locked — click to unlock and edit ticks"
                              : "Unlocked — click to lock"
                          }
                          disabled={isLocking || isRemoving}
                          onClick={() => void handleLock(g.id, !g.locked, i + 1)}
                        >
                          {isLocking ? (
                            <span className={cx(spinner, "size-2.5")} />
                          ) : g.locked ? (
                            "🔒"
                          ) : (
                            "🔓"
                          )}
                        </button>
                      </div>
                      <small className="mt-0.5 block font-semibold opacity-70">
                        {g.playerIds.length}/{session.players.length}
                      </small>
                      {isQueued && (
                        <span
                          className={cx(
                            pill("warn"),
                            "mt-1 px-1.5 py-0.5 text-[9px]",
                          )}
                        >
                          Queued
                        </span>
                      )}
                      {g.status === "ON_COURT" && g.courtNumber != null && (
                        <span
                          className={cx(
                            pill("ok"),
                            "mt-1 px-1.5 py-0.5 text-[9px]",
                          )}
                        >
                          C{g.courtNumber}
                        </span>
                      )}
                      <button
                        className="absolute top-[3px] right-[3px] size-4 rounded-full bg-transparent text-[13px] leading-none text-[#a7b9ca] opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#fde7e5] hover:text-[#b5524f] focus-visible:opacity-100 [@media(hover:none)]:opacity-60"
                        aria-label={`Remove game ${i + 1}`}
                        title="Remove this game"
                        disabled={isRemoving}
                        onClick={() =>
                          setConfirmRemoveGame({ gameId: g.id, n: i + 1 })
                        }
                      >
                        {isRemoving ? (
                          <span className={cx(spinner, "size-2.5")} />
                        ) : (
                          "×"
                        )}
                      </button>
                    </th>
                  );
                })}
                {session.games.length === 0 && (
                  <th
                    className={cx(
                      headGameCell,
                      "font-semibold whitespace-nowrap text-[#9db0c3]",
                    )}
                  >
                    No matches yet
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {session.players.map((p) => {
                const st = statOf.get(p.id);
                const count = st?.count ?? 0;
                const queued = st?.queued ?? 0;
                const behind = max > min && count === min;
                const isNext = nextUp.has(p.id);

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
                          <span className="flex flex-wrap items-center gap-1">
                            {isNext && <em className={pill("next")}>Next up</em>}
                            {queued > 0 && (
                              <em
                                className={cx(
                                  pill("warn"),
                                  "px-1.5 py-0.5 text-[9px]",
                                )}
                              >
                                +{queued} queued
                              </em>
                            )}
                          </span>
                        </span>
                        <span
                          className={cx(
                            "grid h-7 min-w-7 place-items-center rounded-[9px] font-display text-[13px] font-extrabold",
                            behind
                              ? "bg-warn-bg text-warn"
                              : "bg-[#eaf5ff] text-[#337fc4]",
                          )}
                          title={`${count} game${count === 1 ? "" : "s"} played${queued > 0 ? ` (${queued} queued)` : ""}`}
                        >
                          {count}
                        </span>
                      </div>
                    </th>
                    {session.games.map((g, i) => {
                      const isQueued = g.status === "QUEUED";
                      const checked = g.playerIds.includes(p.id);
                      const isPending = pendingTicks.has(`${g.id}:${p.id}`);
                      const bodyCell = cx(
                        "min-w-16 border-b border-[#f0f5f9] py-[11px] text-center",
                        isQueued
                          ? "bg-[#fffcf7]"
                          : g.locked
                            ? "bg-[#f9fbfd]"
                            : rowBg(isNext),
                      );
                      return (
                        <td key={g.id} className={bodyCell}>
                          <input
                            type="checkbox"
                            className={cx(
                              "size-5 cursor-pointer accent-[#5da5e4] transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                              isPending && "animate-pulse opacity-60",
                            )}
                            aria-label={`${p.name} played game ${i + 1}`}
                            checked={checked}
                            disabled={g.locked || isPending}
                            onChange={(e) =>
                              void handleTick(g.id, p.id, e.target.checked)
                            }
                          />
                        </td>
                      );
                    })}
                    {session.games.length === 0 && (
                      <td
                        className={cx(
                          "min-w-16 border-b border-[#f0f5f9] py-[11px] text-center",
                          rowBg(isNext),
                        )}
                      />
                    )}
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
          {session.games.length} match{session.games.length === 1 ? "" : "es"}
        </span>
        <button
          className={linkBtn}
          disabled={!session.games.length || clearing}
          onClick={() => setConfirmClearAll(true)}
        >
          {clearing ? (
            <>
              <span className={cx(spinner, "mr-1.5")} />
              Clearing…
            </>
          ) : (
            "Clear all matches"
          )}
        </button>
      </div>

      {confirmRemoveGame && (
        <ConfirmDialog
          title={`Remove Game ${confirmRemoveGame.n}?`}
          description={`Are you sure you want to remove Game ${confirmRemoveGame.n} from the checklist?`}
          confirmLabel="Remove game"
          busy={removingId === confirmRemoveGame.gameId}
          onConfirm={() => void handleConfirmRemoveGame()}
          onClose={() => setConfirmRemoveGame(null)}
        />
      )}

      {confirmClearAll && (
        <ConfirmDialog
          title="Clear all matches?"
          description={`Remove all ${session.games.length} match${session.games.length === 1 ? "" : "es"} from “${session.name}”? All player game counts will reset to 0.`}
          confirmLabel="Clear all matches"
          busy={clearing}
          onConfirm={() => void handleConfirmClearAll()}
          onClose={() => setConfirmClearAll(false)}
        />
      )}
    </section>
  );
}
