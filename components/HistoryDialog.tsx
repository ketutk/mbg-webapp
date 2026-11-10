"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/format";
import { removeGame } from "@/lib/store";
import type { Session } from "@/lib/types";
import { ConfirmDialog, Dialog } from "./Dialog";
import {
  btn,
  chip,
  cx,
  empty,
  linkBtn,
  pill,
  spinner,
} from "@/lib/ui";

export function HistoryDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    gameId: string;
    n: number;
  } | null>(null);
  const nameOf = new Map(session.players.map((p) => [p.id, p.name]));
  const name = (id: string) => nameOf.get(id) ?? "Removed player";

  // newest first, but keep the original game number
  const games = session.games.map((g, i) => ({ g, n: i + 1 })).reverse();

  async function handleConfirmRemove() {
    if (!confirmTarget) return;
    const { gameId } = confirmTarget;
    setRemovingId(gameId);
    try {
      await removeGame(session.id, gameId);
      setConfirmTarget(null);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Dialog
        title="Match history"
        description={`${session.games.length} match${session.games.length === 1 ? "" : "es"} in ${session.name}. Newest first.`}
        onClose={onClose}
        footer={
          <button className={btn("primary")} onClick={onClose}>
            Close
          </button>
        }
      >
        {games.length === 0 ? (
          <div className={empty}>No matches yet. Assign a match to see it here.</div>
        ) : (
          <ol className="-mx-[23px] max-h-[60vh] list-none overflow-auto border-t border-[#eef4f9]">
            {games.map(({ g, n }) => {
              const isRemoving = removingId === g.id;
              return (
                <li
                  key={g.id}
                  className={cx(
                    "group border-b border-[#f0f5f9] px-[23px] py-3 transition-opacity hover:bg-[#f9fcff]",
                    isRemoving && "opacity-50",
                  )}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-[9px] bg-[#eaf5ff] font-display text-xs font-extrabold text-[#337fc4]">
                      {n}
                    </span>
                    <span className="font-display text-sm font-extrabold text-[#204a74]">
                      Game {n}
                    </span>
                    {g.createdAt && (
                      <span className="text-[11px] text-muted">
                        · {fmtTime(g.createdAt)}
                      </span>
                    )}
                    {g.status === "QUEUED" && (
                      <span className={pill("warn")}>Queued</span>
                    )}
                    {g.status === "ON_COURT" && (
                      <span className={pill("ok")}>
                        On court {g.courtNumber ?? ""}
                      </span>
                    )}
                    {g.status === "DONE" && (
                      <span className={pill("default")}>Finished</span>
                    )}
                    {g.locked && (
                      <span
                        className="text-[11px] text-muted"
                        title="Column is locked"
                      >
                        🔒
                      </span>
                    )}
                    <button
                      className={cx(linkBtn, "ml-auto text-[#b5524f]")}
                      aria-label={`Remove game ${n}`}
                      disabled={isRemoving}
                      onClick={() => setConfirmTarget({ gameId: g.id, n })}
                    >
                      {isRemoving ? (
                        <>
                          <span className={cx(spinner, "mr-1")} />
                          Removing…
                        </>
                      ) : (
                        "Remove"
                      )}
                    </button>
                  </div>

                  {g.teams ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex gap-1">
                        {g.teams[0].map((id) => (
                          <span key={id} className={chip}>
                            {name(id)}
                          </span>
                        ))}
                      </span>
                      <span className="font-display text-[10px] font-extrabold tracking-[2px] text-[#9db0c3]">
                        VS
                      </span>
                      <span className="flex gap-1">
                        {g.teams[1].map((id) => (
                          <span key={id} className={chip}>
                            {name(id)}
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : g.playerIds.length ? (
                    <div className="flex flex-wrap gap-1">
                      {g.playerIds.map((id) => (
                        <span key={id} className={chip}>
                          {name(id)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">No players ticked.</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Dialog>

      {confirmTarget && (
        <ConfirmDialog
          title={`Remove Game ${confirmTarget.n}?`}
          description={`Are you sure you want to remove Game ${confirmTarget.n} from this session? This will update all player match counts.`}
          confirmLabel="Remove game"
          busy={removingId === confirmTarget.gameId}
          onConfirm={() => void handleConfirmRemove()}
          onClose={() => setConfirmTarget(null)}
        />
      )}
    </>
  );
}
