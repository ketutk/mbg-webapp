"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fmtDate, formatIDR } from "@/lib/format";
import { removeTreasuryEntry, useHydrated, useTreasury } from "@/lib/store";
import type { EntryType, TreasuryEntry } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { LoginDialog } from "./LoginDialog";
import { TreasuryEntryDialog } from "./TreasuryEntryDialog";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  eyebrow,
  h1,
  linkBtn,
  pill,
  shimmerCard,
  sub,
  toastBox,
} from "@/lib/ui";

export default function TreasuryApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [dialogMode, setDialogMode] = useState<{
    initialType?: EntryType;
    editingEntry?: TreasuryEntry;
  } | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader active="treasury" user={user} onToast={showToast} />

      <main>
        {!hydrated || authLoading ? (
          <div className={shimmerCard} aria-busy="true" />
        ) : !user ? (
          <section className={cx(card, "mx-auto mt-14 max-w-[480px] p-8 text-center")}>
            <div className={eyebrow}>Organisers only</div>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-[#183e6b]">
              Please log in to view treasury
            </h1>
            <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
              Club treasury balances and transactions are restricted to organisers.
            </p>
            <button
              className={btn("primary")}
              onClick={() => setLoggingIn(true)}
            >
              Admin login
            </button>
          </section>
        ) : (
          <TreasuryContent
            isSuperadmin={isSuperadmin}
            onAdd={(type) => setDialogMode({ initialType: type })}
            onEdit={(entry) => setDialogMode({ editingEntry: entry })}
            onToast={showToast}
          />
        )}
      </main>

      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => showToast("Logged in")}
        />
      )}
      {dialogMode && (
        <TreasuryEntryDialog
          initialType={dialogMode.initialType}
          editingEntry={dialogMode.editingEntry}
          onClose={() => setDialogMode(null)}
          onSaved={showToast}
        />
      )}

      <div
        className={cx(
          toastBox,
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}

function TreasuryContent({
  isSuperadmin,
  onAdd,
  onEdit,
  onToast,
}: {
  isSuperadmin: boolean;
  onAdd: (type: EntryType) => void;
  onEdit: (entry: TreasuryEntry) => void;
  onToast: (msg: string) => void;
}) {
  const { data: treasury, loading } = useTreasury();

  if (loading || !treasury) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  async function handleDelete(entry: TreasuryEntry) {
    if (!window.confirm(`Delete treasury entry “${entry.purpose}”?`)) return;
    try {
      await removeTreasuryEntry(entry.id);
      onToast("Treasury entry deleted");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete entry");
    }
  }

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Club treasury</div>
          <h1 className={h1}>{formatIDR(treasury.balance)}</h1>
          <div className="mt-1 text-xs text-muted">
            Cash left · Income {formatIDR(treasury.income)} · Spent{" "}
            {formatIDR(treasury.expense)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="treasury-add-income"
            className={btn("light")}
            onClick={() => onAdd("INCOME")}
          >
            ＋ Add income
          </button>
          <button
            id="treasury-add"
            className={btn("primary")}
            onClick={() => onAdd("EXPENSE")}
          >
            ＋ Add spent
          </button>
        </div>
      </section>

      <section className={card} aria-labelledby="entries-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="entries-title">
              Transactions
            </h2>
            <div className={sub}>
              Newest date first. All amounts in whole Indonesian Rupiah (IDR).
            </div>
          </div>
          <span className={pill("default")}>
            {treasury.entries.length} entr{treasury.entries.length === 1 ? "y" : "ies"}
          </span>
        </div>

        {treasury.entries.length === 0 ? (
          <div className={empty}>
            No treasury entries yet. Use “＋ Add spent” or “＋ Add income” to start tracking.
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[#eef4f9]">
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
                  <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    Date
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Purpose
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Type
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-right">
                    Amount
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Added by
                  </th>
                  {isSuperadmin && (
                    <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {treasury.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#f9fcff]">
                    <td className="border-b border-[#f0f5f9] py-3 pl-[22px] pr-3 whitespace-nowrap text-muted max-[860px]:pl-3.5">
                      {fmtDate(entry.date)}
                    </td>
                    <td className="border-b border-[#f0f5f9] py-3 px-3 font-bold text-[#204a74]">
                      {entry.purpose}
                    </td>
                    <td className="border-b border-[#f0f5f9] py-3 px-3">
                      <span
                        className={pill(
                          entry.type === "INCOME" ? "ok" : "warn",
                        )}
                      >
                        {entry.type === "INCOME" ? "Income" : "Spent"}
                      </span>
                    </td>
                    <td
                      className={cx(
                        "border-b border-[#f0f5f9] py-3 px-3 text-right font-display font-extrabold whitespace-nowrap",
                        entry.type === "INCOME"
                          ? "text-ok"
                          : "text-[#b5524f]",
                      )}
                    >
                      {entry.type === "INCOME" ? "+" : "−"}
                      {formatIDR(entry.amount)}
                    </td>
                    <td className="border-b border-[#f0f5f9] py-3 px-3 text-muted">
                      {entry.createdByName}
                    </td>
                    {isSuperadmin && (
                      <td className="border-b border-[#f0f5f9] py-3 pr-[22px] pl-3 text-right whitespace-nowrap max-[860px]:pr-3.5">
                        <button
                          className={cx(linkBtn, "mr-2.5")}
                          onClick={() => onEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className={cx(linkBtn, "text-[#b5524f]")}
                          onClick={() => void handleDelete(entry)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

