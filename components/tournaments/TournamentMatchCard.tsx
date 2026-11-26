"use client";

import type { TournamentMatch, TournamentTeam } from "@/lib/types";
import { btn, cx, pill } from "@/lib/ui";

export interface SlotSelection {
  matchId: string;
  side: "A" | "B";
}

export function TournamentMatchCard({
  match,
  teamMap,
  isOrganiser,
  arrangeMode,
  isNextUp,
  canSwapRoundOne,
  selectedSlot,
  canMoveOrderUp,
  canMoveOrderDown,
  canUndo,
  busy,
  onSelectSlot,
  onMoveOrder,
  onStartCourt,
  onEnterScore,
  onWalkover,
  onUndo,
}: {
  match: TournamentMatch;
  teamMap: ReadonlyMap<string, TournamentTeam>;
  isOrganiser: boolean;
  arrangeMode?: boolean;
  isNextUp?: boolean;
  canSwapRoundOne?: boolean;
  selectedSlot?: SlotSelection | null;
  canMoveOrderUp?: boolean;
  canMoveOrderDown?: boolean;
  canUndo: boolean;
  busy?: boolean;
  onSelectSlot?: (slot: SlotSelection) => void;
  onMoveOrder?: (matchId: string, dir: -1 | 1) => void;
  onStartCourt: (match: TournamentMatch) => void;
  onEnterScore: (match: TournamentMatch) => void;
  onWalkover: (match: TournamentMatch, winnerSide: "A" | "B") => void;
  onUndo: (match: TournamentMatch) => void;
}) {
  const teamA = match.teamAId ? teamMap.get(match.teamAId) : null;
  const teamB = match.teamBId ? teamMap.get(match.teamBId) : null;
  const aWon = match.winnerTeamId !== null && match.winnerTeamId === match.teamAId;
  const bWon = match.winnerTeamId !== null && match.winnerTeamId === match.teamBId;

  const statusPill = () => {
    if (match.status === "BYE") return <span className={pill("default")}>BYE</span>;
    if (match.status === "COMPLETED") {
      return (
        <span className={pill("ok")}>
          {match.isWalkover ? "Walkover" : "Done"}
        </span>
      );
    }
    if (match.status === "IN_PROGRESS") {
      return (
        <span className={pill("ok")}>
          {match.courtNumber != null
            ? `Court ${match.courtNumber}`
            : match.queueOrder != null
              ? `Queue #${match.queueOrder}`
              : "In progress"}
        </span>
      );
    }
    if (match.status === "READY") {
      return (
        <span className={pill(isNextUp ? "ok" : "warn")}>
          {isNextUp ? "Next Up" : "Ready"}
        </span>
      );
    }
    return <span className={pill("default")}>Pending</span>;
  };

  const renderTeamRow = (
    side: "A" | "B",
    team: TournamentTeam | null | undefined,
    score: number | null,
    won: boolean,
  ) => {
    const isSelected =
      selectedSlot?.matchId === match.id && selectedSlot.side === side;
    const swappable = Boolean(arrangeMode && canSwapRoundOne);

    const content = (
      <>
        <div className="flex min-w-0 items-center gap-1.5">
          {team && (
            <span className="text-[10px] font-extrabold text-muted">
              #{team.seed}
            </span>
          )}
          <span className="truncate">
            {team ? team.displayName : match.status === "BYE" ? "— BYE —" : "TBD"}
          </span>
        </div>
        {swappable ? (
          <span className="text-[10px] font-extrabold text-[#337fc4]">
            {isSelected ? "Selected" : "⇄"}
          </span>
        ) : (
          score != null && (
            <span className="font-display text-sm font-extrabold">{score}</span>
          )
        )}
      </>
    );

    if (swappable) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelectSlot?.({ matchId: match.id, side })}
          className={cx(
            "flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-all",
            isSelected
              ? "border-[#337fc4] bg-[#dff0ff] text-[#183e6b] ring-2 ring-[#56a2e6]/40"
              : "border-dashed border-[#9ec8ee] bg-[#f4faff] text-[#183e6b] hover:border-[#337fc4] hover:bg-[#e8f4ff]",
          )}
        >
          {content}
        </button>
      );
    }

    return (
      <div
        className={cx(
          "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs",
          won
            ? "bg-[#eaf8f3] font-extrabold text-[#165b4a]"
            : "bg-[#f6fafe] font-bold text-[#183e6b]",
        )}
      >
        {content}
      </div>
    );
  };

  return (
    <div
      className={cx(
        "rounded-2xl border bg-white p-3 shadow-[0_6px_18px_#4898d812]",
        isNextUp && !arrangeMode
          ? "border-[#56a2e6] ring-2 ring-[#56a2e6]/20"
          : "border-[#dcebf8]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {match.status !== "BYE" && match.playOrder != null && (
            <span className="rounded-md bg-[#eaf5ff] px-1.5 py-0.5 font-display text-[10px] font-extrabold text-[#337fc4]">
              #{match.playOrder}
            </span>
          )}
          <span className="font-display text-[11px] font-extrabold tracking-wide text-[#5a7d9c] uppercase">
            {match.label}
          </span>
        </div>
        {statusPill()}
      </div>

      <div className="grid gap-1.5">
        {renderTeamRow("A", teamA, match.scoreA, aWon)}
        {renderTeamRow("B", teamB, match.scoreB, bWon)}
      </div>

      {isOrganiser && arrangeMode && match.status !== "BYE" && (
        <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-[#f0f5f9] pt-2">
          <span className="text-[10px] font-bold text-muted">Play order</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={btn("light", "sm")}
              disabled={busy || !canMoveOrderUp}
              onClick={() => onMoveOrder?.(match.id, -1)}
              aria-label="Move earlier in play order"
            >
              ↑ Earlier
            </button>
            <button
              type="button"
              className={btn("light", "sm")}
              disabled={busy || !canMoveOrderDown}
              onClick={() => onMoveOrder?.(match.id, 1)}
              aria-label="Move later in play order"
            >
              ↓ Later
            </button>
          </div>
        </div>
      )}

      {isOrganiser && !arrangeMode && match.status !== "BYE" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#f0f5f9] pt-2">
          {match.status === "READY" && (
            <>
              <button
                type="button"
                className={cx(btn("primary", "sm"), "flex-1")}
                disabled={busy}
                onClick={() => onStartCourt(match)}
              >
                ▶ Start on Court
              </button>
              <button
                type="button"
                className={btn("light", "sm")}
                disabled={busy}
                title="Award walkover to Team A"
                onClick={() => onWalkover(match, "A")}
              >
                W/O A
              </button>
              <button
                type="button"
                className={btn("light", "sm")}
                disabled={busy}
                title="Award walkover to Team B"
                onClick={() => onWalkover(match, "B")}
              >
                W/O B
              </button>
            </>
          )}

          {match.status === "IN_PROGRESS" && match.courtNumber != null && (
            <button
              type="button"
              className={cx(btn("primary", "sm"), "flex-1")}
              disabled={busy}
              onClick={() => onEnterScore(match)}
            >
              Enter Score
            </button>
          )}

          {match.status === "IN_PROGRESS" && match.courtNumber == null && (
            <span className="text-[11px] font-semibold text-muted">
              Queued in session — start from Session Courts
            </span>
          )}

          {match.status === "COMPLETED" && canUndo && (
            <button
              type="button"
              className={btn("light", "sm")}
              disabled={busy}
              onClick={() => onUndo(match)}
            >
              ↺ Undo result
            </button>
          )}
        </div>
      )}
    </div>
  );
}
