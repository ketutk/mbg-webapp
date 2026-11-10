"use client";

import { useState } from "react";
import {
  clearGames,
  removeGame,
  setGameLocked,
  setPlayed,
} from "@/lib/store";
import { fairnessGap, getStats } from "@/lib/match";
import type { Session } from "@/lib/types";
import { ConfirmDialog, initials } from "@/components/ui";
import {
  PlayerGridHeaderCell,
  PlayerGridRow,
  headCell,
  headGameCell,
  stickyCol,
} from "./PlayerGridCells";
import {
  card,
  cardFoot,
  cardHead,
  cardTitle,
  cx,
  empty,
  linkBtn,
  spinner,
  sub,
} from "@/lib/ui";

export { initials };

function usePlayerGridActions(session: Session, onToast?: (msg: string) => void) {
  const [pendingTicks, setPendingTicks] = useState<Set<string>>(() => new Set());
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmRemoveGame, setConfirmRemoveGame] = useState<{
    gameId: string;
    n: number;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

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
      onToast?.(locked ? `Game ${n} locked` : `Game ${n} unlocked — you can edit ticks now`);
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

  return {
    state: {
      pendingTicks,
      lockingId,
      removingId,
      clearing,
      confirmRemoveGame,
      confirmClearAll,
    },
    setConfirmRemoveGame,
    setConfirmClearAll,
    handleTick,
    handleLock,
    handleConfirmRemoveGame,
    handleConfirmClearAll,
  };
}

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
  const actions = usePlayerGridActions(session, onToast);
  const stats = getStats(session);
  const { min, max } = fairnessGap(stats);
  const statOf = new Map(stats.map((s) => [s.player.id, s]));

  return (
    <section className={card} aria-labelledby="grid-title">
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="grid-title">Games played</h2>
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
                <th className={cx(headCell, stickyCol, "z-2 pr-1.5 pl-[22px] max-[860px]:pl-3.5")}>
                  Player
                </th>
                {session.games.map((g, i) => (
                  <PlayerGridHeaderCell
                    key={g.id}
                    game={g}
                    index={i}
                    totalPlayers={session.players.length}
                    isLocking={actions.state.lockingId === g.id}
                    isRemoving={actions.state.removingId === g.id}
                    onLock={() => void actions.handleLock(g.id, !g.locked, i + 1)}
                    onRemove={() => actions.setConfirmRemoveGame({ gameId: g.id, n: i + 1 })}
                  />
                ))}
                {session.games.length === 0 && (
                  <th className={cx(headGameCell, "font-semibold whitespace-nowrap text-[#9db0c3]")}>
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
                return (
                  <PlayerGridRow
                    key={p.id}
                    player={p}
                    games={session.games}
                    count={count}
                    queued={queued}
                    behind={max > min && count === min}
                    isNext={nextUp.has(p.id)}
                    pendingTicks={actions.state.pendingTicks}
                    onTick={(gId, pId, chk) => void actions.handleTick(gId, pId, chk)}
                  />
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
          type="button"
          className={linkBtn}
          disabled={!session.games.length || actions.state.clearing}
          onClick={() => actions.setConfirmClearAll(true)}
        >
          {actions.state.clearing ? (
            <>
              <span className={cx(spinner, "mr-1.5")} />
              Clearing…
            </>
          ) : (
            "Clear all matches"
          )}
        </button>
      </div>

      {actions.state.confirmRemoveGame && (
        <ConfirmDialog
          title={`Remove Game ${actions.state.confirmRemoveGame.n}?`}
          description={`Are you sure you want to remove Game ${actions.state.confirmRemoveGame.n} from the checklist?`}
          confirmLabel="Remove game"
          busy={actions.state.removingId === actions.state.confirmRemoveGame.gameId}
          onConfirm={() => void actions.handleConfirmRemoveGame()}
          onClose={() => actions.setConfirmRemoveGame(null)}
        />
      )}

      {actions.state.confirmClearAll && (
        <ConfirmDialog
          title="Clear all matches?"
          description={`Remove all ${session.games.length} match${session.games.length === 1 ? "" : "es"} from “${session.name}”? All player game counts will reset to 0.`}
          confirmLabel="Clear all matches"
          busy={actions.state.clearing}
          onConfirm={() => void actions.handleConfirmClearAll()}
          onClose={() => actions.setConfirmClearAll(false)}
        />
      )}
    </section>
  );
}
