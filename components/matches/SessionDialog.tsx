"use client";

import { useState } from "react";
import { createSession, parseNames, todayISO } from "@/lib/store";
import { sessionInput } from "@/lib/schemas";
import type { SessionStatus } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  fieldTextarea,
  modalActions,
  notice,
  spinner,
} from "@/lib/ui";

export function SessionDialog({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(todayISO);
  const [name, setName] = useState("");
  const [courtCount, setCourtCount] = useState(1);
  const [status, setStatus] = useState<SessionStatus>("OPEN");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const names = parseNames(text);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = sessionInput.safeParse({
      name: name.trim() || `Game day ${date}`,
      date,
      courtCount,
      status,
      names,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid session details");
      return;
    }

    setBusy(true);
    try {
      await createSession(parsed.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="New game session"
      description="Name the session, set your court count, choose visibility status, and paste your players one per line."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Session name</span>
            <input
              id="session-name"
              className={fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minggu pagi"
              autoFocus
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Date</span>
            <input
              id="session-date"
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
              id="session-courts"
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
              id="session-status"
              className={fieldInput}
              value={status}
              onChange={(e) => setStatus(e.target.value as SessionStatus)}
            >
              <option value="OPEN">Open (Publicly visible)</option>
              <option value="CLOSED">Closed (Organisers only)</option>
            </select>
          </label>
        </div>
        <label className={field}>
          <span className={fieldLabel}>Players</span>
          <textarea
            id="session-players"
            className={fieldTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"1. Andi\n2. Budi\n3. Citra\n4. Dewi\n5. Eko"}
          />
        </label>
        <div className={notice}>
          {names.length
            ? `${names.length} player${names.length === 1 ? "" : "s"}${
                names.length < 4 ? " · you need at least 4 for match recommendations" : ""
              }`
            : "No players yet — you can also add them later."}
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
            id="create-session"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Creating…
              </>
            ) : (
              "Create session"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
