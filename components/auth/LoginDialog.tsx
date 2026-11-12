"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { Dialog } from "@/components/ui/Dialog";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  modalActions,
  spinner,
} from "@/lib/ui";

export function LoginDialog({
  onClose,
  onLoggedIn,
}: {
  onClose: () => void;
  onLoggedIn?: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your username and password");
      return;
    }

    setBusy(true);
    try {
      await login(parsed.data);
      onLoggedIn?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Admin login"
      description="Sign in with your organiser account to manage courts, matches and treasury."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className={field}>
          <span className={fieldLabel}>Username</span>
          <input
            id="login-username"
            className={fieldInput}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label className={field}>
          <span className={fieldLabel}>Password</span>
          <input
            id="login-password"
            className={fieldInput}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
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
            id="login-submit"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Signing in…
              </>
            ) : (
              "Log in"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

