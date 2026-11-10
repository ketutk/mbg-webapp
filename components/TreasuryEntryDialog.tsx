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
  const [type, setType] = useState<EntryType>(
    editingEntry?.type ?? initialType,
  );
  const [amount, setAmount] = useState(
    editingEntry ? String(editingEntry.amount) : "",
  );
  const [purpose, setPurpose] = useState(editingEntry?.purpose ?? "");
  const [date, setDate] = useState(editingEntry?.date ?? todayISO);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const numAmount = Number(amount);

    setBusy(true);
    try {
      if (editingEntry) {
        const parsed = treasuryPatchInput.safeParse({
          type,
          amount: numAmount,
          purpose: purpose.trim(),
          date,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check entry fields");
          setBusy(false);
          return;
        }
        await editTreasuryEntry(editingEntry.id, parsed.data);
        onSaved("Treasury entry updated");
      } else {
        const parsed = treasuryInput.safeParse({
          type,
          amount: numAmount,
          purpose: purpose.trim(),
          date,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check entry fields");
          setBusy(false);
          return;
        }
        await addTreasuryEntry(parsed.data);
        onSaved(
          type === "EXPENSE" ? "Spent entry added" : "Income entry added",
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={
        editingEntry
          ? "Edit treasury entry"
          : type === "EXPENSE"
            ? "Add spent (expense)"
            : "Add income"
      }
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
            id="treasury-submit"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : editingEntry ? (
              "Save changes"
            ) : type === "EXPENSE" ? (
              "Add spent"
            ) : (
              "Add income"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

