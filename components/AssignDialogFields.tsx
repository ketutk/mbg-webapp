"use client";

import { assignMatch, updateMatchPlayers } from "@/lib/store";
import { assignInput, gameUpdateInput } from "@/lib/schemas";
import type { Game, Session, Team } from "@/lib/types";
import type { AssignDialogConfig } from "./AssignDialog";
import { btn, field, fieldInput, fieldLabel } from "@/lib/ui";

export function initialSlots(
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

export async function submitAssign({
  sessionId,
  editingGameId,
  targetType,
  courtNumber,
  slots,
}: {
  sessionId: string;
  editingGameId?: string;
  targetType: "court" | "queue";
  courtNumber: number;
  slots: [string, string, string, string];
}): Promise<string> {
  const teams: [Team, Team] = [
    [slots[0], slots[1]],
    [slots[2], slots[3]],
  ];
  if (editingGameId) {
    const parsed = gameUpdateInput.safeParse({ teams });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Pick 4 different players");
    await updateMatchPlayers(sessionId, editingGameId, parsed.data.teams);
    return "Match players updated";
  }
  const payload = {
    target: targetType === "court" ? ({ type: "court" as const, courtNumber }) : ({ type: "queue" as const }),
    teams,
  };
  const parsed = assignInput.safeParse(payload);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Pick 4 different players");
  await assignMatch(sessionId, parsed.data);
  return targetType === "court"
    ? `Match assigned to Court ${courtNumber} — 4 players ticked & locked`
    : "Match added to queue — 4 players ticked & flagged Queued";
}

export function TargetControls({
  isEditing,
  targetType,
  courtNumber,
  courts,
  hasRec,
  onTargetChange,
  onCourtChange,
  onApplyRec,
}: {
  isEditing: boolean;
  targetType: "court" | "queue";
  courtNumber: number;
  courts: { courtNumber: number; game: Game | null }[];
  hasRec: boolean;
  onTargetChange: (t: "court" | "queue") => void;
  onCourtChange: (c: number) => void;
  onApplyRec: () => void;
}) {
  if (isEditing) return null;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            className={btn(targetType === "court" ? "primary" : "light", "sm")}
            onClick={() => onTargetChange("court")}
          >
            Assign to court
          </button>
          <button
            type="button"
            className={btn(targetType === "queue" ? "primary" : "light", "sm")}
            onClick={() => onTargetChange("queue")}
          >
            Add to queue
          </button>
        </div>
        {hasRec && (
          <button type="button" className={btn("light", "sm")} onClick={onApplyRec}>
            Use recommendation
          </button>
        )}
      </div>

      {targetType === "court" && (
        <label className={field}>
          <span className={fieldLabel}>Court</span>
          <select
            className={fieldInput}
            value={courtNumber}
            onChange={(e) => onCourtChange(Number(e.target.value))}
          >
            {courts.map((c) => (
              <option key={c.courtNumber} value={c.courtNumber}>
                Court {c.courtNumber}
                {c.game ? " (in use — will replace current match)" : " (empty)"}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

export function PlayerSelectField({
  id,
  label,
  value,
  slots,
  index,
  session,
  busyMap,
  countMap,
  requiresFreePlayers,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  slots: [string, string, string, string];
  index: number;
  session: Session;
  busyMap: Map<string, number>;
  countMap: Map<string, number>;
  requiresFreePlayers: boolean;
  onChange: (val: string) => void;
}) {
  const otherChosen = new Set(slots.filter((_, i) => i !== index));

  return (
    <label className={field}>
      <span className={fieldLabel}>{label}</span>
      <select
        id={id}
        className={fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="">Select player…</option>
        {session.players.map((p) => {
          if (otherChosen.has(p.id) && p.id !== value) return null;
          const onCourt = busyMap.get(p.id);
          const played = countMap.get(p.id) ?? 0;
          const disabled = Boolean(onCourt && requiresFreePlayers && p.id !== value);
          return (
            <option key={p.id} value={p.id} disabled={disabled}>
              {p.name} ({played} played{onCourt ? ` · currently on court ${onCourt}` : ""})
            </option>
          );
        })}
      </select>
    </label>
  );
}
