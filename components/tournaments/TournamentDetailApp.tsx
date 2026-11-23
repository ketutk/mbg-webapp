"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { finishMatchInput } from "@/lib/schemas";
import {
  deleteTournament,
  finishMatch,
  resetTournament,
  undoTournamentMatch,
  useTournamentDetail,
  walkoverTournamentMatch,
} from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { TournamentMatch, TournamentStatus } from "@/lib/types";
import {
  btn,
  card,
  cx,
  errorNotice,
  eyebrow,
  field,
  fieldInput,
  fieldLabel,
  h1,
  modalActions,
  pill,
  skelBar,
  spinner,
} from "@/lib/ui";
import { TournamentBracket } from "./TournamentBracket";
import { TournamentDraftSetup } from "./TournamentDraftSetup";
import { TournamentTeamsTable } from "./TournamentTeamsTable";

const TournamentAssignDialog = dynamic(() =>
  import("./TournamentAssignDialog").then((m) => m.TournamentAssignDialog),
);

const statusLabel: Record<TournamentStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "Live",
  COMPLETED: "Completed",
};

const statusTone: Record<TournamentStatus, "default" | "ok" | "warn"> = {
  DRAFT: "warn",
  IN_PROGRESS: "ok",
  COMPLETED: "default",
};

export function TournamentDetailApp({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const showToast = useToast();
  const { data: tournament, error, loading } = useTournamentDetail(id);

  const [assigningMatch, setAssigningMatch] =
    useState<TournamentMatch | null>(null);
  const [scoringMatch, setScoringMatch] = useState<TournamentMatch | null>(
    null,
  );
  const [scoreA, setScoreA] = useState("21");
  const [scoreB, setScoreB] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const isOrganiser = Boolean(user);
  const isSuperadmin = user?.role === "SUPERADMIN";

  if (loading) {
    return (
      <div className="mt-8 grid gap-4" data-skeleton="">
        <div className={skelBar("w-48", "h-6")} />
        <div className={skelBar("w-80", "h-9")} />
        <div className={cx(card, "h-64")} />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <section
        className={cx(card, "mx-auto mt-10 max-w-[480px] p-8 text-center")}
      >
        <div className={eyebrow}>Tournament unavailable</div>
        <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
          {error instanceof Error ? error.message : "Tournament not found"}
        </h2>
        <Link href="/tournaments" className={cx(btn("primary"), "mt-5")}>
          ← Back to Tournaments
        </Link>
      </section>
    );
  }

  const teamMap = new Map(tournament.teams.map((t) => [t.id, t]));
  const champion = tournament.teams.find((t) => t.status === "CHAMPION");
  const canReset =
    isOrganiser &&
    tournament.status === "IN_PROGRESS" &&
    !tournament.matches.some(
      (m) => m.status === "IN_PROGRESS" || m.status === "COMPLETED",
    );

  async function handleWalkover(match: TournamentMatch, winnerSide: "A" | "B") {
    if (!tournament) return;
    setBusyMatchId(match.id);
    try {
      await walkoverTournamentMatch(tournament.id, match.id, winnerSide);
      showToast(`Walkover awarded in ${match.label}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not award walkover");
    } finally {
      setBusyMatchId(null);
    }
  }

  async function handleUndo(match: TournamentMatch) {
    if (!tournament) return;
    setBusyMatchId(match.id);
    try {
      await undoTournamentMatch(tournament.id, match.id);
      showToast(`Reverted ${match.label}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not undo match");
    } finally {
      setBusyMatchId(null);
    }
  }

  async function handleSubmitScore(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament || !scoringMatch?.gameId) return;
    setScoreError("");
    const parsed = finishMatchInput.safeParse({
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
    });
    if (!parsed.success) {
      setScoreError(parsed.error.issues[0]?.message ?? "Enter valid scores");
      return;
    }

    setBusyMatchId(scoringMatch.id);
    try {
      await finishMatch(tournament.session.id, scoringMatch.gameId, parsed.data);
      setScoringMatch(null);
      setScoreA("21");
      setScoreB("");
      showToast(`${scoringMatch.label} finished — bracket updated!`);
    } catch (err) {
      setScoreError(
        err instanceof Error ? err.message : "Could not finish match",
      );
    } finally {
      setBusyMatchId(null);
    }
  }

  async function handleConfirmReset() {
    if (!tournament) return;
    setActionBusy(true);
    try {
      await resetTournament(tournament.id);
      setConfirmReset(false);
      showToast("Bracket reset to Draft");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not reset bracket");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!tournament) return;
    setActionBusy(true);
    try {
      await deleteTournament(tournament.id, tournament.session.id);
      setConfirmDelete(false);
      showToast("Tournament deleted");
      router.push("/tournaments");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not delete tournament",
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <>
      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={eyebrow}>
              {fmtDate(tournament.session.date)} · {tournament.session.name}
            </span>
            <span className={pill(statusTone[tournament.status])}>
              {statusLabel[tournament.status]}
            </span>
          </div>
          <h1 className={h1}>{tournament.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/tournaments" className={btn("light")}>
            ← All tournaments
          </Link>
          <Link
            href={`/sessions/${tournament.session.id}`}
            className={btn("primary")}
          >
            Open Session Courts →
          </Link>
          {canReset && (
            <button
              type="button"
              className={btn("light")}
              onClick={() => setConfirmReset(true)}
            >
              Reset to Draft
            </button>
          )}
          {isSuperadmin && (
            <button
              type="button"
              className={btn("danger")}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}
        </div>
      </section>

      {champion && (
        <section className="mb-5 rounded-[22px] border border-[#bbf7d0] bg-[linear-gradient(135deg,#ecfdf5,#f0f9ff)] p-5 shadow-[0_10px_24px_#2f8f7b1a]">
          <div className="text-[11px] font-extrabold tracking-widest text-[#15803d] uppercase">
            🏆 Tournament Champion
          </div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[#183e6b]">
            {champion.displayName}
          </div>
        </section>
      )}

      {tournament.status === "DRAFT" ? (
        <TournamentDraftSetup tournament={tournament} />
      ) : (
        <>
          <TournamentBracket
            tournament={tournament}
            isOrganiser={isOrganiser}
            busyMatchId={busyMatchId}
            onStartCourt={(m) => setAssigningMatch(m)}
            onEnterScore={(m) => {
              setScoringMatch(m);
              setScoreA("21");
              setScoreB("");
              setScoreError("");
            }}
            onWalkover={(m, side) => void handleWalkover(m, side)}
            onUndo={(m) => void handleUndo(m)}
          />
          <TournamentTeamsTable
            tournament={tournament}
            isOrganiser={isOrganiser}
          />
        </>
      )}

      {assigningMatch && (
        <TournamentAssignDialog
          tournament={tournament}
          match={assigningMatch}
          onClose={() => setAssigningMatch(null)}
          onAssigned={(msg) => showToast(msg)}
        />
      )}

      {scoringMatch && (
        <Dialog
          title={`Finish ${scoringMatch.label}`}
          description="Enter final match score. Winner advances and the losing pair returns to casual play."
          onClose={() => setScoringMatch(null)}
        >
          <form onSubmit={handleSubmitScore} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className={field}>
                <span className={fieldLabel}>
                  {(scoringMatch.teamAId &&
                    teamMap.get(scoringMatch.teamAId)?.displayName) ||
                    "Team A"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  className={fieldInput}
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  required
                />
              </label>
              <label className={field}>
                <span className={fieldLabel}>
                  {(scoringMatch.teamBId &&
                    teamMap.get(scoringMatch.teamBId)?.displayName) ||
                    "Team B"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  className={fieldInput}
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  autoFocus
                  required
                />
              </label>
            </div>
            {scoreError && <div className={errorNotice}>{scoreError}</div>}
            <div className={modalActions}>
              <button
                type="button"
                className={btn("light")}
                onClick={() => setScoringMatch(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={btn("primary")}
                disabled={busyMatchId === scoringMatch.id}
              >
                {busyMatchId === scoringMatch.id ? (
                  <>
                    <span className={cx(spinner, "mr-1.5")} />
                    Saving…
                  </>
                ) : (
                  "Save Score"
                )}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset bracket to Draft?"
          description="This clears the generated bracket so you can edit teams and re-seed."
          confirmLabel="Reset bracket"
          busy={actionBusy}
          onConfirm={() => void handleConfirmReset()}
          onClose={() => setConfirmReset(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${tournament.name}”?`}
          description="Removes this tournament and its bracket. Any already-played session games remain in the session history."
          confirmLabel="Delete tournament"
          busy={actionBusy}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
