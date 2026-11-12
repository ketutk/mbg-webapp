"use client";

import type { PublicGame } from "@/lib/types";
import {
  card,
  cardHead,
  cardTitle,
  chip,
  cx,
  emptySmall,
  pill,
  sub,
} from "@/lib/ui";

export function VisitorQueueSection({
  queue,
  nameOf,
}: {
  queue: PublicGame[];
  nameOf: Map<string, string>;
}) {
  const playerName = (id: string) => nameOf.get(id) ?? "Player";

  return (
    <section
      className={cx(card, "mb-5")}
      aria-labelledby="visitor-queue-title"
    >
      <div className={cardHead}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cardTitle} id="visitor-queue-title">
              Queue · Next matches
            </h2>
            <span className={pill(queue.length ? "warn" : "default")}>
              {queue.length} queued
            </span>
          </div>
          <div className={sub}>
            Players in the queue are next up when a court finishes.
          </div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className={emptySmall}>No matches queued right now.</div>
      ) : (
        <ol className="list-none border-t border-[#eef4f9]">
          {queue.map((g, i) => {
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
                className="flex flex-wrap items-center gap-2.5 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
              >
                <span className="grid size-6 place-items-center rounded-lg bg-[#eaf5ff] font-display text-xs font-extrabold text-[#337fc4]">
                  {i + 1}
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
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

