"use client";

import type { TournamentMatch, TournamentTeam } from "@/lib/types";
import { btn, cx, pill } from "@/lib/ui";

export function TournamentMatchCard({
  match,
  teamMap,
  isOrganiser,
  canUndo,
  busy,
  onStartCourt,
  onEnterScore,
  onWalkover,
  onUndo,
}: {
  match: TournamentMatch;
  teamMap: ReadonlyMap<string, TournamentTeam>;
  isOrganiser: boolean;
  canUndo: boolean;
  busy?: boolean;
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
      return <span className={pill("warn")}>Ready</span>;
    }
    return <span className={pill("default")}>Pending</span>;
  };

  const renderTeamRow = (
    team: TournamentTeam | null | undefined,
    score: number | null,
    won: boolean,
  ) => (
    <div
      className={cx(
        "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs",
        won
          ? "bg-[#eaf8f3] font-extrabold text-[#165b4a]"
          : "bg-[#f6fafe] font-bold text-[#183e6b]",
      )}
    >
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
      {score != null && (
        <span className="font-display text-sm font-extrabold">{score}</span>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-[#dcebf8] bg-white p-3 shadow-[0_6px_18px_#4898d812]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-display text-[11px] font-extrabold tracking-wide text-[#5a7d9c] uppercase">
          {match.label}
        </span>
        {statusPill()}
      </div>

      <div className="grid gap-1.5">
        {renderTeamRow(teamA, match.scoreA, aWon)}
        {renderTeamRow(teamB, match.scoreB, bWon)}
      </div>

      {isOrganiser && match.status !== "BYE" && (
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
