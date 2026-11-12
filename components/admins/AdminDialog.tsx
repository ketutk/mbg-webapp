"use client";

import { useState } from "react";
import { createAdmin, resetAdminPassword } from "@/lib/store";
import { adminCreateInput, adminPasswordInput } from "@/lib/schemas";
import type { AdminUser } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  modalActions,
  notice,
  spinner,
} from "@/lib/ui";

export function AdminDialog({
  resetTarget,
  onClose,
  onSaved,
}: {
  resetTarget?: AdminUser;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setBusy(true);
    try {
      if (resetTarget) {
        const parsed = adminPasswordInput.safeParse({ password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid password");
          setBusy(false);
          return;
        }
        await resetAdminPassword(resetTarget.id, parsed.data);
        onSaved(`Password reset for ${resetTarget.username} — tokens revoked`);
      } else {
        const parsed = adminCreateInput.safeParse({ username, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check username and password");
          setBusy(false);
          return;
        }
        await createAdmin(parsed.data);
        onSaved(`Admin “${parsed.data.username}” created`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={
        resetTarget
          ? `Reset password · ${resetTarget.username}`
          : "Add admin account"
      }
      description={
        resetTarget
          ? "Set a new password for this admin. All their active sessions will be signed out."
          : "Create an organiser account. Admins can manage courts, queue, checklist and add treasury entries."
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {!resetTarget && (
          <label className={field}>
            <span className={fieldLabel}>Username</span>
            <input
              id="admin-username"
              className={fieldInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="organiser1"
              autoFocus
              required
            />
          </label>
        )}

        <label className={field}>
          <span className={fieldLabel}>
            {resetTarget ? "New password" : "Initial password"}
          </span>
          <input
            id="admin-password"
            className={fieldInput}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={Boolean(resetTarget)}
            required
          />
        </label>

        <div className={notice}>
          Username: 3–32 lowercase characters. Password: at least 10 characters.
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
            id="admin-submit"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : resetTarget ? (
              "Reset password"
            ) : (
              "Create admin"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

