"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { assignTournamentMatch } from "@/lib/store";
import type { TournamentDetail, TournamentMatch } from "@/lib/types";
import { btn, cx, errorNotice, modalActions, pill, spinner } from "@/lib/ui";

export function TournamentAssignDialog({
  tournament,
  match,
  onClose,
  onAssigned,
}: {
  tournament: TournamentDetail;
  match: TournamentMatch;
  onClose: () => void;
  onAssigned: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const teamMap = new Map(tournament.teams.map((t) => [t.id, t]));
  const teamA = match.teamAId ? teamMap.get(match.teamAId) : null;
  const teamB = match.teamBId ? teamMap.get(match.teamBId) : null;

  const busySet = new Set(tournament.session.busyPlayerIds);
  const busyNames = [
    teamA?.player1,
    teamA?.player2,
    teamB?.player1,
    teamB?.player2,
  ]
    .filter((p): p is NonNullable<typeof p> => Boolean(p && busySet.has(p.id)))
    .map((p) => p.name);

  const occupiedSet = new Set(tournament.session.occupiedCourts);
  const courts = Array.from(
    { length: tournament.session.courtCount },
    (_, i) => i + 1,
  );

  async function handleAssign(
    target: { type: "court"; courtNumber: number } | { type: "queue" },
  ) {
    setError("");
    setBusy(true);
    try {
      await assignTournamentMatch(tournament.id, match.id, target);
      onAssigned(
        target.type === "court"
          ? `${match.label} started on Court ${target.courtNumber}`
          : `${match.label} added to session queue`,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign match");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`Start ${match.label}`}
      description={`${teamA?.displayName ?? "TBD"} vs ${teamB?.displayName ?? "TBD"} · ${tournament.session.name}`}
      onClose={onClose}
    >
      <div className="grid gap-3">
        {busyNames.length > 0 && (
          <div className={errorNotice}>
            Currently playing on another court: {busyNames.join(", ")}. You can
            still add this match to the session queue.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
          {courts.map((c) => {
            const occupied = occupiedSet.has(c);
            const preferred = tournament.preferredCourts.includes(c);
            const disabled = busy || occupied || busyNames.length > 0;
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => void handleAssign({ type: "court", courtNumber: c })}
                className={cx(
                  "flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all",
                  disabled
                    ? "cursor-not-allowed border-[#e6eff7] bg-[#f7fafd] opacity-60"
                    : "border-[#cde2f5] bg-white hover:border-[#56a2e6] hover:bg-[#f4faff]",
                )}
              >
                <div>
                  <div className="font-display text-sm font-extrabold text-[#183e6b]">
                    Court {c}
                  </div>
                  {preferred && !occupied && (
                    <div className="text-[10px] font-extrabold text-[#337fc4]">
                      Preferred tournament court
                    </div>
                  )}
                </div>
                <span className={pill(occupied ? "warn" : "ok")}>
                  {occupied ? "In use" : "Open"}
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className={errorNotice}>{error}</div>}

        <div className={modalActions}>
          <button
            type="button"
            className={btn("light")}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={btn("light")}
            disabled={busy}
            onClick={() => void handleAssign({ type: "queue" })}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Assigning…
              </>
            ) : (
              "Add to Session Queue"
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
