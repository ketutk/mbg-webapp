"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { tournamentCreateInput } from "@/lib/schemas";
import {
  createTournament,
  parseNames,
  todayISO,
  useSessionsList,
} from "@/lib/store";
import type { TournamentDetail } from "@/lib/types";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldTextarea,
  modalActions,
  spinner,
} from "@/lib/ui";

export function TournamentCreateDialog({
  defaultSessionId,
  onClose,
  onCreated,
}: {
  defaultSessionId?: string;
  onClose: () => void;
  onCreated: (t: TournamentDetail) => void;
}) {
  const { data: sessionsPage } = useSessionsList({
    status: "OPEN",
    pageSize: 50,
  });
  const openSessions = sessionsPage?.sessions ?? [];

  const [mode, setMode] = useState<"existing" | "new">(
    defaultSessionId || openSessions.length > 0 ? "existing" : "new",
  );
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState(
    defaultSessionId ?? openSessions[0]?.id ?? "",
  );
  const [hasThirdPlace, setHasThirdPlace] = useState(false);

  // New session fields when mode === "new"
  const [sessionName, setSessionName] = useState("Sunday Open Play");
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [courtCount, setCourtCount] = useState(2);
  const [namesText, setNamesText] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveSessionId =
    sessionId || defaultSessionId || openSessions[0]?.id || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload =
      mode === "existing"
        ? {
            name,
            sessionId: effectiveSessionId,
            hasThirdPlace,
            preferredCourts: [],
          }
        : {
            name,
            hasThirdPlace,
            preferredCourts: [],
            createSession: {
              name: sessionName,
              date: sessionDate,
              courtCount,
              status: "OPEN" as const,
              names: parseNames(namesText),
            },
          };

    const parsed = tournamentCreateInput.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your tournament details");
      return;
    }

    setBusy(true);
    try {
      const created = await createTournament(parsed.data);
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create tournament",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="New Tournament"
      description="Link to a session so tournament matches count toward player totals and eliminated pairs flow back into casual courts."
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-3.5">
        <label className={field}>
          <span className={fieldLabel}>Tournament name</span>
          <input
            type="text"
            className={fieldInput}
            placeholder="e.g. Sunday Mini Cup — Men's Doubles"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </label>

        {!defaultSessionId && (
          <div className="flex gap-2 rounded-xl border border-[#dcebf8] bg-[#f4faff] p-1">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={cx(
                "flex-1 rounded-lg py-1.5 text-xs font-extrabold transition-all",
                mode === "existing"
                  ? "bg-white text-[#204a74] shadow-xs"
                  : "text-muted hover:text-[#204a74]",
              )}
            >
              Link open session
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={cx(
                "flex-1 rounded-lg py-1.5 text-xs font-extrabold transition-all",
                mode === "new"
                  ? "bg-white text-[#204a74] shadow-xs"
                  : "text-muted hover:text-[#204a74]",
              )}
            >
              Create new session
            </button>
          </div>
        )}

        {mode === "existing" ? (
          <label className={field}>
            <span className={fieldLabel}>Linked session</span>
            <select
              className={fieldInput}
              value={effectiveSessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={Boolean(defaultSessionId)}
              required
            >
              {openSessions.length === 0 && !defaultSessionId && (
                <option value="">No open sessions — switch to Create new session</option>
              )}
              {openSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.date} · {s.playerCount} players · {s.courtCount}{" "}
                  court{s.courtCount === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 rounded-2xl border border-[#e3effa] bg-[#f8fbff] p-3.5">
            <label className={field}>
              <span className={fieldLabel}>Session name</span>
              <input
                type="text"
                className={fieldInput}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={field}>
                <span className={fieldLabel}>Date</span>
                <input
                  type="date"
                  className={fieldInput}
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </label>
              <label className={field}>
                <span className={fieldLabel}>Courts</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className={fieldInput}
                  value={courtCount}
                  onChange={(e) => setCourtCount(Number(e.target.value) || 1)}
                  required
                />
              </label>
            </div>
            <label className={field}>
              <span className={fieldLabel}>Players (one per line)</span>
              <textarea
                className={fieldTextarea}
                placeholder={"Budi\nAndi\nRina\nSari"}
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
              />
            </label>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#e6f0f8] bg-[#fafdff] px-3.5 py-2.5 text-xs font-bold text-[#204a74]">
          <input
            type="checkbox"
            checked={hasThirdPlace}
            onChange={(e) => setHasThirdPlace(e.target.checked)}
            className="size-4 accent-[#337fc4]"
          />
          <span>Include 3rd-place playoff match (for 4+ teams)</span>
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
          <button type="submit" className={btn("primary")} disabled={busy}>
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Creating…
              </>
            ) : (
              "Create Draft"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
