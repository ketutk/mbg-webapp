"use client";

import { useState } from "react";
import { addTreasuryEntry, editTreasuryEntry, todayISO } from "@/lib/store";
import { treasuryInput, treasuryPatchInput } from "@/lib/schemas";
import type { EntryType, TreasuryEntry } from "@/lib/types";
import { Dialog } from "./Dialog";
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

async function saveEntry(
  editingEntry: TreasuryEntry | undefined,
  input: { type: EntryType; amount: number; purpose: string; date: string },
) {
  if (editingEntry) {
    const parsed = treasuryPatchInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check entry fields");
    await editTreasuryEntry(editingEntry.id, parsed.data);
    return "Treasury entry updated";
  }
  const parsed = treasuryInput.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check entry fields");
  await addTreasuryEntry(parsed.data);
  return input.type === "EXPENSE" ? "Spent entry added" : "Income entry added";
}

function getDialogTitle(editing: boolean, type: EntryType): string {
  if (editing) return "Edit treasury entry";
  return type === "EXPENSE" ? "Add spent (expense)" : "Add income";
}

function getSubmitLabel(editing: boolean, type: EntryType): string {
  if (editing) return "Save changes";
  return type === "EXPENSE" ? "Add spent" : "Add income";
}

export function TreasuryEntryDialog({
  initialType = "EXPENSE",
  editingEntry,
  onClose,
  onSaved,
}: {
  initialType?: EntryType;
  editingEntry?: TreasuryEntry;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [type, setType] = useState<EntryType>(editingEntry?.type ?? initialType);
  const [amount, setAmount] = useState(editingEntry ? String(editingEntry.amount) : "");
  const [purpose, setPurpose] = useState(editingEntry?.purpose ?? "");
  const [date, setDate] = useState(editingEntry?.date ?? todayISO);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const msg = await saveEntry(editingEntry, {
        type,
        amount: Number(amount),
        purpose: purpose.trim(),
        date,
      });
      onSaved(msg);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  }

  const isEditing = Boolean(editingEntry);

  return (
    <Dialog
      title={getDialogTitle(isEditing, type)}
      description="Record club income or expenses in whole IDR."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="mb-3 flex gap-1.5">
          <button
            type="button"
            className={btn(type === "EXPENSE" ? "primary" : "light", "sm")}
            onClick={() => setType("EXPENSE")}
          >
            Expense (Spent)
          </button>
          <button
            type="button"
            className={btn(type === "INCOME" ? "primary" : "light", "sm")}
            onClick={() => setType("INCOME")}
          >
            Income
          </button>
        </div>

        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Amount (IDR)</span>
            <input
              id="treasury-amount"
              className={fieldInput}
              type="number"
              min={1}
              max={1000000000}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150000"
              autoFocus
              required
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Date</span>
            <input
              id="treasury-date"
              className={fieldInput}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label className={field}>
          <span className={fieldLabel}>Purpose / information</span>
          <input
            id="treasury-purpose"
            className={fieldInput}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Shuttlecocks 2 tubes + court booking"
            maxLength={200}
            required
          />
        </label>

        <div className={notice}>Whole rupiah only (no decimals).</div>
        {error && <div className={errorNotice}>{error}</div>}

        <div className={modalActions}>
          <button type="button" className={btn("light")} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" id="treasury-submit" className={btn("primary")} disabled={busy}>
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : (
              getSubmitLabel(isEditing, type)
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
