"use client";

import { useState } from "react";
import { changePassword } from "@/lib/auth";
import { changePasswordInput } from "@/lib/schemas";
import { Modal } from "./Modal";
import {
  btn,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  modalActions,
  notice,
} from "@/lib/ui";

export function PasswordDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = changePasswordInput.safeParse({
      currentPassword,
      newPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setBusy(true);
    try {
      await changePassword(parsed.data);
      onSaved("Password updated — other sessions signed out");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Change password"
      description="Enter your current password and choose a new password (at least 10 characters)."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className={field}>
          <span className={fieldLabel}>Current password</span>
          <input
            id="current-password"
            className={fieldInput}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        <label className={field}>
          <span className={fieldLabel}>New password</span>
          <input
            id="new-password"
            className={fieldInput}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <div className={notice}>Minimum 10 characters, max 72 bytes.</div>
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
            id="save-password"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

