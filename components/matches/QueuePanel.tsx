"use client";

import { queueOf } from "@/lib/match";
import type { Game, Session } from "@/lib/types";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  chip,
  cx,
  emptySmall,
  linkBtn,
  pill,
  spinner,
  sub,
} from "@/lib/ui";

export function QueuePanel({
  session,
  movingGameId,
  removingGameId,
  onAddQueue,
  onEditGame,
  onRemoveGame,
  onMoveQueue,
}: {
  session: Session;
  movingGameId: string | null;
  removingGameId: string | null;
  onAddQueue: () => void;
  onEditGame: (game: Game) => void;
  onRemoveGame: (game: Game) => void;
  onMoveQueue: (index: number, direction: -1 | 1) => void;
}) {
  const queue = queueOf(session);
  const nameOf = new Map(session.players.map((p) => [p.id, p.name]));
  const playerName = (id: string) => nameOf.get(id) ?? "Player";

  return (
    <section className={cx(card, "mb-5")} aria-labelledby="queue-title">
      <div className={cardHead}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cardTitle} id="queue-title">
              Queue · Next matches
            </h2>
            <span className={pill(queue.length ? "warn" : "default")}>
              {queue.length} queued
            </span>
          </div>
          <div className={sub}>
            Queued matches already count in games played and are flagged as “Queued” until placed on a court.
          </div>
        </div>
        <button
          id="queue-add-btn"
          className={btn("primary", "sm")}
          onClick={onAddQueue}
          disabled={session.players.length < 4}
        >
          ＋ Add to queue
        </button>
      </div>

      {queue.length === 0 ? (
        <div className={emptySmall}>
          No matches in the queue. Use “＋ Add to queue” or the recommendation card to line up the next match.
        </div>
      ) : (
        <ol className="list-none border-t border-[#eef4f9]">
          {queue.map((g, i) => {
            const isMoving = movingGameId === g.id;
            const isRemoving = removingGameId === g.id;
            const isBusy = isMoving || isRemoving || movingGameId !== null;
            const teams =
              g.teams ??
              (g.playerIds.length === 4
                ? ([
                    [g.playerIds[0], g.playerIds[1]],
                    [g.playerIds[2], g.playerIds[3]],
                  ] as const)
                : undefined);

            return (
              <li
                key={g.id}
                className={cx(
                  "flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f5f9] px-[22px] py-3 transition-opacity last:border-b-0 max-[860px]:px-[15px]",
                  (isMoving || isRemoving) && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="grid size-6 place-items-center rounded-lg bg-[#eaf5ff] font-display text-xs font-extrabold text-[#337fc4]">
                    {isMoving ? <span className={spinner} /> : i + 1}
                  </span>
                  <span className={pill("warn")}>Queued</span>
                  {teams ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex gap-1">
                        {teams[0].map((id) => (
                          <span key={id} className={chip}>
                            {playerName(id)}
                          </span>
                        ))}
                      </span>
                      <span className="px-1 font-display text-[10px] font-extrabold tracking-[2px] text-[#9db0c3]">
                        VS
                      </span>
                      <span className="flex gap-1">
                        {teams[1].map((id) => (
                          <span key={id} className={chip}>
                            {playerName(id)}
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.playerIds.map((id) => (
                        <span key={id} className={chip}>
                          {playerName(id)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    className={linkBtn}
                    aria-label={`Move queued match ${i + 1} up`}
                    title="Move up"
                    disabled={i === 0 || isBusy}
                    onClick={() => onMoveQueue(i, -1)}
                  >
                    ▲
                  </button>
                  <button
                    className={linkBtn}
                    aria-label={`Move queued match ${i + 1} down`}
                    title="Move down"
                    disabled={i === queue.length - 1 || isBusy}
                    onClick={() => onMoveQueue(i, 1)}
                  >
                    ▼
                  </button>
                  <button
                    className={linkBtn}
                    disabled={isBusy}
                    onClick={() => onEditGame(g)}
                  >
                    Edit
                  </button>
                  <button
                    className={cx(linkBtn, "text-[#b5524f]")}
                    aria-label={`Remove queued match ${i + 1}`}
                    disabled={isBusy}
                    onClick={() => onRemoveGame(g)}
                  >
                    {isRemoving ? <span className={spinner} /> : "✕"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
