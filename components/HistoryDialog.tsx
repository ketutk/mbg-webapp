"use client";

import { Modal } from "./Modal";
import { removeGame } from "@/lib/store";
import { btn, cx, empty, linkBtn, modalActions, pill } from "@/lib/ui";
import type { Session } from "@/lib/types";

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const chip =
  "inline-block rounded-lg border border-[#e3f0fb] bg-[#f4faff] px-2 py-1 text-xs font-bold text-[#315d84]";

export function HistoryDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const nameOf = new Map(session.players.map((p) => [p.id, p.name]));
  const name = (id: string) => nameOf.get(id) ?? "Removed player";

  // newest first, but keep the original game number
  const games = session.games.map((g, i) => ({ g, n: i + 1 })).reverse();

  return (
    <Modal
      title="Match history"
      description={`${session.games.length} game${session.games.length === 1 ? "" : "s"} played in ${session.name}. Newest first.`}
      onClose={onClose}
    >
      {games.length === 0 ? (
        <div className={empty}>No games yet. Start a match to see it here.</div>
      ) : (
        <ol className="-mx-[23px] max-h-[60vh] list-none overflow-auto border-t border-[#eef4f9]">
          {games.map(({ g, n }) => (
            <li
              key={g.id}
              className="group border-b border-[#f0f5f9] px-[23px] py-3 hover:bg-[#f9fcff]"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-[9px] bg-[#eaf5ff] font-display text-xs font-extrabold text-[#337fc4]">
                  {n}
                </span>
                <span className="font-display text-sm font-extrabold text-[#204a74]">
                  Game {n}
                </span>
                {g.createdAt && (
                  <span className="text-[11px] text-muted">· {fmtTime(g.createdAt)}</span>
                )}
                <span className={cx(pill(g.teams ? "default" : "warn"), "ml-auto")}>
                  {g.teams ? "Recommended" : `${g.playerIds.length} ticked`}
                </span>
                <button
                  className={cx(linkBtn, "text-[#b5524f]")}
                  aria-label={`Remove game ${n}`}
                  onClick={() => {
                    if (window.confirm(`Remove game ${n}?`)) removeGame(session.id, g.id);
                  }}
                >
                  Remove
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
          ))}
        </ol>
      )}

      <div className={modalActions}>
        <button className={btn("primary")} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
