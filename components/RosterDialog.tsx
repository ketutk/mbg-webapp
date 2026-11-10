"use client";

import { useState } from "react";
import { parseNames, setRoster } from "@/lib/store";
import { rosterInput } from "@/lib/schemas";
import type { Session } from "@/lib/types";
import { Dialog } from "./Dialog";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldLabel,
  fieldTextarea,
  modalActions,
  notice,
  spinner,
} from "@/lib/ui";

export function RosterDialog({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved?: (msg: string) => void;
}) {
  const [text, setText] = useState(
    session.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n"),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const names = parseNames(text);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = rosterInput.safeParse({ names });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid player list");
      return;
    }

    setBusy(true);
    try {
      await setRoster(session.id, parsed.data.names);
      onSaved?.("Roster updated");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save roster");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Edit players"
      description="One player per line. Players you keep (same name) keep their games; removed players lose theirs and unlock affected matches."
      onClose={onClose}
    >
      <form onSubmit={save}>
        <label className={field}>
          <span className={fieldLabel}>Players</span>
          <textarea
            id="roster-text"
            className={fieldTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </label>
        <div className={notice}>
          {names.length} player{names.length === 1 ? "" : "s"}
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
            id="save-roster"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : (
              "Save players"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
