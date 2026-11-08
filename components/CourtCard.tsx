"use client";

import { fmtTime } from "@/lib/format";
import type { Game, PublicGame } from "@/lib/types";
import { initials } from "./PlayerGrid";
import {
  avatar,
  btn,
  courtCard,
  courtCardEmpty,
  cx,
  pill,
} from "@/lib/ui";

export function CourtCard({
  courtNumber,
  game,
  nameOf,
  hasQueue,
  readOnly,
  onAssign,
  onPromote,
  onEdit,
  onFinish,
}: {
  courtNumber: number;
  game: Game | PublicGame | null;
  nameOf: ReadonlyMap<string, string>;
  hasQueue?: boolean;
  readOnly?: boolean;
  onAssign?: (courtNumber: number) => void;
  onPromote?: (courtNumber: number) => void;
  onEdit?: (game: Game) => void;
  onFinish?: (game: Game) => void;
}) {
  const playerName = (id: string) => nameOf.get(id) ?? "Player";

  if (!game) {
    return (
      <div className={cx(courtCardEmpty, "flex flex-col justify-between gap-3")}>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-extrabold text-[#204a74]">
            Court {courtNumber}
          </span>
          <span className={pill("default")}>Open</span>
        </div>
        <div className="py-3 text-center text-xs text-muted">
          No match on this court right now.
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              className={cx(btn("primary", "sm"), "flex-1")}
              onClick={() => onAssign?.(courtNumber)}
            >
              ＋ Assign players
            </button>
            {hasQueue && (
              <button
                className={cx(btn("light", "sm"), "flex-1")}
                onClick={() => onPromote?.(courtNumber)}
              >
                ▶ Play next in queue
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const startedAt = "startedAt" in game ? game.startedAt : undefined;
  const teams =
    game.teams ??
    (game.playerIds.length === 4
      ? ([
          [game.playerIds[0], game.playerIds[1]],
          [game.playerIds[2], game.playerIds[3]],
        ] as const)
      : undefined);

  return (
    <div className={cx(courtCard, "flex flex-col justify-between gap-3")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-extrabold text-[#204a74]">
            Court {courtNumber}
          </span>
          {startedAt && (
            <span className="text-[11px] text-muted">
              · Playing since {fmtTime(startedAt)}
            </span>
          )}
        </div>
        <span className={pill("ok")}>On court</span>
      </div>

      {teams ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-[#f4faff] p-3 max-[520px]:grid-cols-1">
          <div className="grid gap-1.5">
            <div className="text-[9px] font-extrabold tracking-[1.2px] text-[#5794c9] uppercase">
              Team A
            </div>
            {teams[0].map((id) => (
              <div key={id} className="flex items-center gap-2 min-w-0">
                <span className={avatar}>{initials(playerName(id))}</span>
                <span className="truncate text-xs font-extrabold text-[#204a74]">
                  {playerName(id)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-1 text-center font-display text-[10px] font-extrabold tracking-[2px] text-[#8aa6c1]">
            VS
          </div>
          <div className="grid gap-1.5">
            <div className="text-[9px] font-extrabold tracking-[1.2px] text-[#5794c9] uppercase">
              Team B
            </div>
            {teams[1].map((id) => (
              <div key={id} className="flex items-center gap-2 min-w-0">
                <span className={avatar}>{initials(playerName(id))}</span>
                <span className="truncate text-xs font-extrabold text-[#204a74]">
                  {playerName(id)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[#f4faff] p-3">
          {game.playerIds.map((id) => (
            <span
              key={id}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#204a74]"
            >
              {playerName(id)}
            </span>
          ))}
        </div>
      )}

      {!readOnly && "locked" in game && (
        <div className="flex justify-end gap-2">
          <button
            className={btn("light", "sm")}
            onClick={() => onEdit?.(game)}
          >
            Edit players
          </button>
          <button
            className={btn("primary", "sm")}
            onClick={() => onFinish?.(game)}
          >
            ✓ Finish match
          </button>
        </div>
      )}
    </div>
  );
}

