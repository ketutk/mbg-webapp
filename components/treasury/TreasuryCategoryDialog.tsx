"use client";

import { useState } from "react";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { treasuryCategoryInput, treasuryCategoryPatchInput } from "@/lib/schemas";
import {
  createTreasuryCategory,
  deleteTreasuryCategory,
  updateTreasuryCategory,
  useTreasuryCategories,
} from "@/lib/store";
import type { EntryType, TreasuryCategory } from "@/lib/types";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  linkBtn,
  pill,
  spinner,
} from "@/lib/ui";

type TypeChoice = "ALL" | EntryType;

export function TreasuryCategoryDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: categories, loading } = useTreasuryCategories();
  const [name, setName] = useState("");
  const [typeChoice, setTypeChoice] = useState<TypeChoice>("EXPENSE");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TreasuryCategory | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = treasuryCategoryInput.safeParse({
      name,
      type: typeChoice === "ALL" ? null : typeChoice,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid category name");
      return;
    }

    setBusy(true);
    try {
      await createTreasuryCategory(parsed.data);
      setName("");
      onSaved(`Category “${parsed.data.name}” added`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string) {
    const parsed = treasuryCategoryPatchInput.safeParse({ name: editName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid category name");
      return;
    }
    setError("");
    setEditBusy(true);
    try {
      await updateTreasuryCategory(id, parsed.data);
      setEditingId(null);
      onSaved("Category updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename category");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await deleteTreasuryCategory(deleteTarget.id);
      setDeleteTarget(null);
      onSaved(`Category “${deleteTarget.name}” deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog
        title="Treasury categories"
        description="Create or rename custom income and expense categories. Default categories cannot be deleted."
        onClose={onClose}
        footer={
          <button type="button" className={btn("primary")} onClick={onClose}>
            Done
          </button>
        }
      >
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-2xl border border-[#e3f0fb] bg-[#f7fbff] p-3.5"
        >
          <div className={fieldRow}>
            <label className={field}>
              <span className={fieldLabel}>New category name</span>
              <input
                id="new-category-name"
                className={fieldInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Court Drinks"
                maxLength={40}
                autoFocus
                required
              />
            </label>
            <label className={field}>
              <span className={fieldLabel}>Applies to</span>
              <select
                id="new-category-type"
                className={fieldInput}
                value={typeChoice}
                onChange={(e) => setTypeChoice(e.target.value as TypeChoice)}
              >
                <option value="EXPENSE">Spent (Expense)</option>
                <option value="INCOME">Income</option>
                <option value="ALL">Both</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className={errorNotice}>{error}</div>
            <button
              type="submit"
              id="create-category-submit"
              className={btn("primary", "sm")}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className={cx(spinner, "mr-1.5")} />
                  Adding…
                </>
              ) : (
                "＋ Add category"
              )}
            </button>
          </div>
        </form>

        <div className="max-h-[42vh] overflow-auto rounded-2xl border border-[#eef4f9]">
          {loading && categories.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted">
              Loading categories…
            </div>
          ) : (
            <ul className="list-none">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                return (
                  <li
                    key={cat.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f5f9] px-3.5 py-2.5 last:border-b-0"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          className={cx(fieldInput, "py-1.5 text-xs")}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={40}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={btn("primary", "sm")}
                          disabled={editBusy}
                          onClick={() => void handleRename(cat.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={btn("light", "sm")}
                          disabled={editBusy}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs font-extrabold text-[#204a74]">
                            {cat.name}
                          </span>
                          <span
                            className={pill(
                              cat.type === "INCOME"
                                ? "ok"
                                : cat.type === "EXPENSE"
                                  ? "warn"
                                  : "default",
                            )}
                          >
                            {cat.type === "INCOME"
                              ? "Income"
                              : cat.type === "EXPENSE"
                                ? "Spent"
                                : "Both"}
                          </span>
                          {cat.isSystem && (
                            <span className="text-[10px] font-bold text-muted">
                              Default
                            </span>
                          )}
                        </div>

                        {!cat.isSystem && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className={linkBtn}
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditName(cat.name);
                                setError("");
                              }}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={cx(linkBtn, "text-[#b5524f]")}
                              onClick={() => setDeleteTarget(cat)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Dialog>

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete category “${deleteTarget.name}”?`}
          description="Entries using this category will be reassigned to “Others”."
          confirmLabel="Delete category"
          busy={deleting}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
