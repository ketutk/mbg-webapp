"use client";

import { useState } from "react";
import {
  busyPlayers,
  courtsOf,
  getStats,
  type Recommendation,
} from "@/lib/match";
import type { Game, Session, Team } from "@/lib/types";
import { Dialog } from "./Dialog";
import {
  PlayerSelectField,
  TargetControls,
  initialSlots,
  submitAssign,
} from "./AssignDialogFields";
import {
  btn,
  errorNotice,
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

function TeamInputs({
  slots,
  session,
  busyMap,
  countMap,
  requiresFreePlayers,
  onSetSlot,
}: {
  slots: [string, string, string, string];
  session: Session;
  busyMap: Map<string, number>;
  countMap: Map<string, number>;
  requiresFreePlayers: boolean;
  onSetSlot: (index: 0 | 1 | 2 | 3, val: string) => void;
}) {
  return (
    <>
      <div className="mb-2 text-[11px] font-extrabold text-[#527a9e]">Team A</div>
      <div className={fieldRow}>
        <PlayerSelectField
          id="assign-player-1"
          label="Player 1"
          value={slots[0]}
          slots={slots}
          index={0}
          session={session}
          busyMap={busyMap}
          countMap={countMap}
          requiresFreePlayers={requiresFreePlayers}
          onChange={(val) => onSetSlot(0, val)}
        />
        <PlayerSelectField
          id="assign-player-2"
          label="Player 2"
          value={slots[1]}
          slots={slots}
          index={1}
          session={session}
          busyMap={busyMap}
          countMap={countMap}
          requiresFreePlayers={requiresFreePlayers}
          onChange={(val) => onSetSlot(1, val)}
        />
      </div>

      <div className="mt-3 mb-2 text-[11px] font-extrabold text-[#527a9e]">Team B</div>
      <div className={fieldRow}>
        <PlayerSelectField
          id="assign-player-3"
          label="Player 3"
          value={slots[2]}
          slots={slots}
          index={2}
          session={session}
          busyMap={busyMap}
          countMap={countMap}
          requiresFreePlayers={requiresFreePlayers}
          onChange={(val) => onSetSlot(2, val)}
        />
        <PlayerSelectField
          id="assign-player-4"
          label="Player 4"
          value={slots[3]}
          slots={slots}
          index={3}
          session={session}
          busyMap={busyMap}
          countMap={countMap}
          requiresFreePlayers={requiresFreePlayers}
          onChange={(val) => onSetSlot(3, val)}
        />
      </div>
    </>
  );
}

function getSubmitBtnText(isEditing: boolean, targetType: "court" | "queue", courtNumber: number): string {
  if (isEditing) return "Save changes";
  return targetType === "court" ? `Assign to Court ${courtNumber}` : "Add to queue";
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

  const requiresFreePlayers = isEditing
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
    setBusy(true);
    try {
      const msg = await submitAssign({
        sessionId: session.id,
        editingGameId: config.editingGame?.id,
        targetType,
        courtNumber,
        slots,
      });
      onSaved(msg);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
    } finally {
      setBusy(false);
    }
  }

  const dialogTitle = isEditing
    ? "Edit match players"
    : targetType === "court"
      ? "Assign match to court"
      : "Add match to queue";

  return (
    <Dialog
      title={dialogTitle}
      description={
        isEditing
          ? "Update the 4 players and teams for this match."
          : "Pick 4 players split into Team A and Team B. Their checklist column will be ticked and locked."
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <TargetControls
          isEditing={isEditing}
          targetType={targetType}
          courtNumber={courtNumber}
          courts={courts}
          hasRec={Boolean(rec)}
          onTargetChange={setTargetType}
          onCourtChange={setCourtNumber}
          onApplyRec={applyRecommendation}
        />

        <TeamInputs
          slots={slots}
          session={session}
          busyMap={busyMap}
          countMap={countMap}
          requiresFreePlayers={requiresFreePlayers}
          onSetSlot={setSlot}
        />

        {targetType === "queue" && busySelected.length > 0 && (
          <div className={notice}>
            Note: {busySelected.join(", ")} will finish on court before this queued match can start.
          </div>
        )}

        {error && <div className={errorNotice}>{error}</div>}

        <div className={modalActions}>
          <button type="button" className={btn("light")} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btn("primary")} disabled={busy}>
            {busy ? (
              <>
                <span className={spinner} />
                <span className="ml-1.5">Saving…</span>
              </>
            ) : (
              getSubmitBtnText(isEditing, targetType, courtNumber)
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
