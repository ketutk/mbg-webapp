"use client";

import { useState } from "react";
import { updateSession } from "@/lib/store";
import { sessionPatchInput } from "@/lib/schemas";
import type { Session, SessionStatus } from "@/lib/types";
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

export function SessionSettingsDialog({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState(session.name);
  const [date, setDate] = useState(session.date);
  const [courtCount, setCourtCount] = useState(session.courtCount);
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = sessionPatchInput.safeParse({
      name: name.trim(),
      date,
      courtCount,
      status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid session settings");
      return;
    }

    setBusy(true);
    try {
      await updateSession(session.id, parsed.data);
      onSaved("Session settings saved");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Session settings"
      description="Update the session name, date, number of courts, or open/closed visibility."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Session name</span>
            <input
              id="settings-name"
              className={fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Date</span>
            <input
              id="settings-date"
              className={fieldInput}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Courts available (1–8)</span>
            <input
              id="settings-courts"
              className={fieldInput}
              type="number"
              min={1}
              max={8}
              value={courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value) || 1)}
              required
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Status</span>
            <select
              id="settings-status"
              className={fieldInput}
              value={status}
              onChange={(e) => setStatus(e.target.value as SessionStatus)}
            >
              <option value="OPEN">Open (Publicly visible)</option>
              <option value="CLOSED">Closed (Organisers only)</option>
            </select>
          </label>
        </div>
        <div className={notice}>
          Court count cannot be lowered below an occupied court. Closed sessions are hidden from visitors.
        </div>
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
            id="save-settings"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

