"use client";

import { useState } from "react";
import { assignMatch, updateMatchPlayers } from "@/lib/store";
import {
  busyPlayers,
  courtsOf,
  getStats,
  type Recommendation,
} from "@/lib/match";
import { assignInput, gameUpdateInput } from "@/lib/schemas";
import type { Game, Session, Team } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  modalActions,
  notice,
  spinner,
} from "@/lib/ui";

export interface AssignDialogConfig {
  mode: "court" | "queue";
  courtNumber?: number;
  prefill?: [Team, Team];
  editingGame?: Game;
}

function initialSlots(
  session: Session,
  config: AssignDialogConfig,
): [string, string, string, string] {
  if (config.editingGame?.teams) {
    const [t1, t2] = config.editingGame.teams;
    return [t1[0], t1[1], t2[0], t2[1]];
  }
  if (config.editingGame && config.editingGame.playerIds.length === 4) {
    const [a, b, c, d] = config.editingGame.playerIds;
    return [a, b, c, d];
  }
  if (config.prefill) {
    const [t1, t2] = config.prefill;
    return [t1[0], t1[1], t2[0], t2[1]];
  }
  const ids = session.players.slice(0, 4).map((p) => p.id);
  return [ids[0] ?? "", ids[1] ?? "", ids[2] ?? "", ids[3] ?? ""];
}

export function AssignDialog({
  session,
  rec,
  config,
  onClose,
  onSaved,
}: {
  session: Session;
  rec: Recommendation | null;
  config: AssignDialogConfig;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const courts = courtsOf(session);
  const firstEmptyCourt =
    courts.find((c) => !c.game)?.courtNumber ?? config.courtNumber ?? 1;

  const [targetType, setTargetType] = useState<"court" | "queue">(config.mode);
  const [courtNumber, setCourtNumber] = useState<number>(
    config.courtNumber ?? firstEmptyCourt,
  );
  const [slots, setSlots] = useState<[string, string, string, string]>(() =>
    initialSlots(session, config),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isEditing = Boolean(config.editingGame);
  const busyMap = busyPlayers(session, config.editingGame?.id);
  const stats = getStats(session);
  const countMap = new Map(stats.map((s) => [s.player.id, s.count]));

  const requiresFreePlayers =
    isEditing
      ? config.editingGame?.status === "ON_COURT"
      : targetType === "court";

  function applyRecommendation() {
    if (!rec) return;
    const [t1, t2] = rec.teams;
    setSlots([t1[0].id, t1[1].id, t2[0].id, t2[1].id]);
    setError("");
  }

  function setSlot(index: 0 | 1 | 2 | 3, value: string) {
    setSlots((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[index] = value;
      return next;
    });
  }

  const busySelected = slots
    .map((id) => {
      const c = busyMap.get(id);
      const name = session.players.find((p) => p.id === id)?.name;
      return c && name ? `${name} (on Court ${c})` : null;
    })
    .filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const teams: [Team, Team] = [
      [slots[0], slots[1]],
      [slots[2], slots[3]],
    ];

    setBusy(true);
    try {
      if (config.editingGame) {
        const parsed = gameUpdateInput.safeParse({ teams });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Pick 4 different players");
          setBusy(false);
          return;
        }
        await updateMatchPlayers(session.id, config.editingGame.id, parsed.data.teams);
        onSaved("Match players updated");
      } else {
        const payload = {
          target:
            targetType === "court"
              ? ({ type: "court" as const, courtNumber })
              : ({ type: "queue" as const }),
          teams,
        };
        const parsed = assignInput.safeParse(payload);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Pick 4 different players");
          setBusy(false);
          return;
        }
        await assignMatch(session.id, parsed.data);
        onSaved(
          targetType === "court"
            ? `Match assigned to Court ${courtNumber} — 4 players ticked & locked`
            : "Match added to queue — 4 players ticked & flagged Queued",
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
    } finally {
      setBusy(false);
    }
  }

  function renderSelect(index: 0 | 1 | 2 | 3, label: string) {
    const current = slots[index];
    const otherChosen = new Set(slots.filter((_, i) => i !== index));

    return (
      <label className={field}>
        <span className={fieldLabel}>{label}</span>
        <select
          id={`assign-player-${index + 1}`}
          className={fieldInput}
          value={current}
          onChange={(e) => setSlot(index, e.target.value)}
          required
        >
          <option value="">Select player…</option>
          {session.players.map((p) => {
            if (otherChosen.has(p.id) && p.id !== current) return null;
            const onCourt = busyMap.get(p.id);
            const played = countMap.get(p.id) ?? 0;
            const disabled = Boolean(onCourt && requiresFreePlayers && p.id !== current);
            return (
              <option key={p.id} value={p.id} disabled={disabled}>
                {p.name} ({played} played
                {onCourt ? ` · currently on court ${onCourt}` : ""})
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  return (
    <Dialog
      title={
        isEditing
          ? "Edit match players"
          : targetType === "court"
            ? "Assign match to court"
            : "Add match to queue"
      }
      description={
        isEditing
          ? "Update the 4 players and teams for this match."
          : "Pick 4 players split into Team A and Team B. Their checklist column will be ticked and locked."
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {!isEditing && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                className={btn(targetType === "court" ? "primary" : "light", "sm")}
                onClick={() => setTargetType("court")}
              >
                Assign to court
              </button>
              <button
                type="button"
                className={btn(targetType === "queue" ? "primary" : "light", "sm")}
                onClick={() => setTargetType("queue")}
              >
                Add to queue
              </button>
            </div>
            {rec && (
              <button
                type="button"
                className={btn("light", "sm")}
                onClick={applyRecommendation}
              >
                Use recommendation
              </button>
            )}
          </div>
        )}

        {!isEditing && targetType === "court" && (
          <label className={field}>
            <span className={fieldLabel}>Court</span>
            <select
              id="assign-court-select"
              className={fieldInput}
              value={courtNumber}
              onChange={(e) => setCourtNumber(Number(e.target.value))}
            >
              {courts.map((c) => (
                <option
                  key={c.courtNumber}
                  value={c.courtNumber}
                  disabled={Boolean(c.game)}
                >
                  Court {c.courtNumber}
                  {c.game ? " (Occupied)" : " (Open)"}
                </option>
              ))}
            </select>
          </label>
        )}

        {isEditing && rec && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className={btn("light", "sm")}
              onClick={applyRecommendation}
            >
              Use recommendation
            </button>
          </div>
        )}

        <div className="mb-2 rounded-2xl border border-[#e1edf7] bg-[#f8fcff] p-3">
          <div className="mb-2 text-[10px] font-extrabold tracking-[1.4px] text-[#3c78aa] uppercase">
            Team A
          </div>
          <div className={fieldRow}>
            {renderSelect(0, "Player A1")}
            {renderSelect(1, "Player A2")}
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-[#e1edf7] bg-[#f8fcff] p-3">
          <div className="mb-2 text-[10px] font-extrabold tracking-[1.4px] text-[#3c78aa] uppercase">
            Team B
          </div>
          <div className={fieldRow}>
            {renderSelect(2, "Player B1")}
            {renderSelect(3, "Player B2")}
          </div>
        </div>

        {busySelected.length > 0 && (
          <div className={cx(notice, "mb-1 text-warn")}>
            Note: {busySelected.join(", ")}{" "}
            {requiresFreePlayers
              ? "cannot start on a second court while still playing."
              : "is currently on court and will play this queued match next."}
          </div>
        )}

        {error && <div className={errorNotice}>{error}</div>}

        <div className={modalActions}>
          <button
            type="button"
            className={btn("light")}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="confirm-assign"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : isEditing ? (
              "Save match"
            ) : targetType === "court" ? (
              `Start on Court ${courtNumber}`
            ) : (
              "Add to queue"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

