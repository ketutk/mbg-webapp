"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { parseNames, setRoster } from "@/lib/store";
import { btn, field, fieldLabel, fieldTextarea, modalActions, notice } from "@/lib/ui";
import type { Session } from "@/lib/types";

export function RosterDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [text, setText] = useState(
    session.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n"),
  );
  const names = parseNames(text);

  function save() {
    setRoster(session.id, names);
    onClose();
  }

  return (
    <Modal
      title="Edit players"
      description="One player per line. Players you keep (same name) keep their games; removed players lose theirs."
      onClose={onClose}
    >
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
      <div className={modalActions}>
        <button className={btn("light")} onClick={onClose}>
          Cancel
        </button>
        <button id="save-roster" className={btn("primary")} onClick={save}>
          Save players
        </button>
      </div>
    </Modal>
  );
}
