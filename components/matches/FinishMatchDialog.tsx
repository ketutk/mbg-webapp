"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { initials } from "@/lib/initials";
import { finishMatchInput } from "@/lib/schemas";
import { finishMatch } from "@/lib/store";
import type { Game, Session } from "@/lib/types";
import {
  avatar,
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  modalActions,
  notice,
  pill,
  spinner,
} from "@/lib/ui";

export function FinishMatchDialog({
  session,
  game,
  onClose,
  onSaved,
}: {
  session: Session;
  game: Game;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nameOf = new Map(session.players.map((p) => [p.id, p.name]));
  const name = (id: string) => nameOf.get(id) ?? "Player";

  const hasTeams = Boolean(game.teams);
  const teamA = game.teams ? game.teams[0] : null;
  const teamB = game.teams ? game.teams[1] : null;

  const trimmedA = scoreA.trim();
  const trimmedB = scoreB.trim();
  const numA = trimmedA === "" ? null : Number(trimmedA);
  const numB = trimmedB === "" ? null : Number(trimmedB);
  const winnerHint =
    numA !== null &&
    numB !== null &&
    Number.isInteger(numA) &&
    Number.isInteger(numB) &&
    numA >= 0 &&
    numB >= 0 &&
    numA !== numB
      ? numA > numB
        ? "Team A wins"
        : "Team B wins"
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!trimmedA || !trimmedB) {
      setError("Enter final scores for both Team A and Team B");
      return;
    }

    const parsed = finishMatchInput.safeParse({
      scoreA: Number(trimmedA),
      scoreB: Number(trimmedB),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid final scores");
      return;
    }

    setBusy(true);
    try {
      await finishMatch(session.id, game.id, parsed.data);
      const label = game.courtNumber ? `Court ${game.courtNumber}` : "Match";
      onSaved(
        `${label} finished (${parsed.data.scoreA}–${parsed.data.scoreB})`,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish match");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={
        game.courtNumber
          ? `Finish match · Court ${game.courtNumber}`
          : "Finish match"
      }
      description="Record the final match score to determine the winning team for the session leaderboard."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {teamA && teamB ? (
          <div className="mb-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-[#e3f0fb] bg-[#f4faff] p-3 max-[520px]:grid-cols-1">
            <div className="grid gap-1.5">
              <div className="text-[10px] font-extrabold tracking-[1.2px] text-[#5794c9] uppercase">
                Team A
              </div>
              {teamA.map((id) => (
                <div key={id} className="flex min-w-0 items-center gap-2">
                  <span className={avatar}>{initials(name(id))}</span>
                  <span className="truncate text-xs font-extrabold text-[#204a74]">
                    {name(id)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-1 text-center font-display text-[10px] font-extrabold tracking-[2px] text-[#8aa6c1]">
              VS
            </div>
            <div className="grid gap-1.5">
              <div className="text-[10px] font-extrabold tracking-[1.2px] text-[#5794c9] uppercase">
                Team B
              </div>
              {teamB.map((id) => (
                <div key={id} className="flex min-w-0 items-center gap-2">
                  <span className={avatar}>{initials(name(id))}</span>
                  <span className="truncate text-xs font-extrabold text-[#204a74]">
                    {name(id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-3.5 rounded-2xl border border-[#fde7c7] bg-warn-bg px-3.5 py-2.5 text-[11px] font-bold text-warn">
            Team split was cleared by manual checklist edits — scores will be
            saved without updating win/loss stats.
          </div>
        )}

        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Team A score</span>
            <input
              id="finish-score-a"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              className={cx(
                fieldInput,
                "font-display text-base font-extrabold text-[#183e6b]",
              )}
              placeholder="21"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Team B score</span>
            <input
              id="finish-score-b"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              className={cx(
                fieldInput,
                "font-display text-base font-extrabold text-[#183e6b]",
              )}
              placeholder="18"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="mb-1 flex min-h-6 items-center justify-between gap-2">
          {winnerHint && hasTeams ? (
            <span className={pill("ok")}>{winnerHint}</span>
          ) : (
            <span className={notice}>
              Enter final points for each team (no ties).
            </span>
          )}
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
            type="submit"
            id="finish-match-submit"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : (
              "✓ Finish & save score"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
