"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { createSession, parseNames, todayISO } from "@/lib/store";
import {
  btn,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  fieldTextarea,
  modalActions,
  notice,
} from "@/lib/ui";

export function SessionDialog({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(todayISO);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const names = parseNames(text);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createSession({
      name: name.trim() || `Game day ${date}`,
      date,
      names,
    });
    onClose();
  }

  return (
    <Modal
      title="New game session"
      description="Name the session and paste your players, one per line. Numbered lists work too."
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
        <div className={modalActions}>
          <button type="button" className={btn("light")} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" id="create-session" className={btn("primary")}>
            Create session
          </button>
        </div>
      </form>
    </Modal>
  );
}
