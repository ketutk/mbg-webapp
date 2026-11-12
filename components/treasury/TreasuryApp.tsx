"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addDaysISO, getMonthRange, shiftMonth } from "@/lib/date";
import { fmtDate, fmtMonth, formatIDR, todayISO } from "@/lib/format";
import { useToast } from "@/lib/stores/ui-store";
import { removeTreasuryEntry, useHydrated, useTreasury } from "@/lib/store";
import type { EntryType, TreasuryEntry, TreasuryMonthlyBucket } from "@/lib/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { Toast } from "@/components/ui/Toast";
import { TreasuryEntryDialog } from "./TreasuryEntryDialog";
import {
  btn,
  card,
  cardFoot,
  cardHead,
  cardTitle,
  cx,
  empty,
  eyebrow,
  fieldInput,
  h1,
  linkBtn,
  pill,
  selectInput,
  shimmerCard,
  spinner,
  sub,
} from "@/lib/ui";

type PeriodPreset =
  | "all"
  | "this-month"
  | "last-month"
  | "last-30"
  | "last-90"
  | "this-year"
  | "month"
  | "custom";

function computePresetDates(
  preset: PeriodPreset,
  selectedMonth: string,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string; label: string } {
  const today = todayISO();
  const currentYm = today.slice(0, 7);

  switch (preset) {
    case "all":
      return { label: "All time" };
    case "this-month": {
      const r = getMonthRange(currentYm);
      return { ...r, label: `This month (${fmtMonth(currentYm)})` };
    }
    case "last-month": {
      const prevYm = shiftMonth(currentYm, -1);
      const r = getMonthRange(prevYm);
      return { ...r, label: `Last month (${fmtMonth(prevYm)})` };
    }
    case "last-30":
      return {
        from: addDaysISO(today, -29),
        to: today,
        label: "Last 30 days",
      };
    case "last-90":
      return {
        from: addDaysISO(today, -89),
        to: today,
        label: "Last 90 days",
      };
    case "this-year": {
      const year = today.slice(0, 4);
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        label: `Year ${year}`,
      };
    }
    case "month": {
      const r = getMonthRange(selectedMonth);
      return { ...r, label: fmtMonth(selectedMonth) };
    }
    case "custom":
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
        label:
          customFrom && customTo
            ? `${fmtDate(customFrom)} – ${fmtDate(customTo)}`
            : customFrom
              ? `From ${fmtDate(customFrom)}`
              : customTo
                ? `Until ${fmtDate(customTo)}`
                : "Custom range",
      };
  }
}

export default function TreasuryApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [dialogMode, setDialogMode] = useState<{
    initialType?: EntryType;
    editingEntry?: TreasuryEntry;
  } | null>(null);
  const showToast = useToast();

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader active="treasury" user={user} onToast={showToast} />

      <main>
        {!hydrated || authLoading ? (
          <div className={shimmerCard} aria-busy="true" />
        ) : !user ? (
          <section
            className={cx(card, "mx-auto mt-14 max-w-[480px] p-8 text-center")}
          >
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

      <Toast />
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
  const defaultYm = useMemo(() => todayISO().slice(0, 7), []);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYm);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | EntryType>("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<TreasuryEntry | null>(null);

  const periodRange = useMemo(
    () => computePresetDates(preset, selectedMonth, customFrom, customTo),
    [preset, selectedMonth, customFrom, customTo],
  );

  const filterParams = useMemo(
    () => ({
      from: periodRange.from,
      to: periodRange.to,
      type: typeFilter,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [periodRange.from, periodRange.to, typeFilter, searchText, page, pageSize],
  );

  const { data: treasury, loading, fetching } = useTreasury(filterParams);

  if (loading && !treasury) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  if (!treasury) return null;

  const hasActiveFilters =
    preset !== "all" || typeFilter !== "ALL" || searchText.trim().length > 0;

  function resetFilters() {
    setPreset("all");
    setTypeFilter("ALL");
    setSearchText("");
    setCustomFrom("");
    setCustomTo("");
    setPage(1);
  }

  function handleSelectMonthFromChart(ym: string) {
    if (preset === "month" && selectedMonth === ym) {
      setPreset("all");
    } else {
      setSelectedMonth(ym);
      setPreset("month");
    }
    setPage(1);
  }

  async function handleConfirmDelete() {
    if (!confirmEntry) return;
    setDeletingId(confirmEntry.id);
    try {
      await removeTreasuryEntry(confirmEntry.id);
      setConfirmEntry(null);
      onToast("Treasury entry deleted");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  const allTimeVolume = treasury.income + treasury.expense;
  const incomeRatioPct =
    allTimeVolume > 0 ? Math.round((treasury.income / allTimeVolume) * 100) : 50;

  const startRow =
    treasury.totalEntries === 0 ? 0 : (treasury.page - 1) * treasury.pageSize + 1;
  const endRow = Math.min(
    treasury.totalEntries,
    treasury.page * treasury.pageSize,
  );

  const presetOptions: { id: PeriodPreset; label: string }[] = [
    { id: "all", label: "All time" },
    { id: "this-month", label: "This month" },
    { id: "last-month", label: "Last month" },
    { id: "last-30", label: "Last 30d" },
    { id: "last-90", label: "Last 90d" },
    { id: "this-year", label: "This year" },
    { id: "month", label: "By month" },
    { id: "custom", label: "Custom range" },
  ];

  return (
    <>
      {/* Top Hero Header */}
      <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Club treasury</div>
          <h1 className={h1}>{formatIDR(treasury.balance)}</h1>
          <div className="mt-1 text-xs text-muted">
            All-time cash left · Total income {formatIDR(treasury.income)} · Total
            spent {formatIDR(treasury.expense)}
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

      {/* Dashboard KPI Cards */}
      <section
        aria-label="Treasury overview"
        className="mb-5 grid grid-cols-4 gap-3.5 max-[980px]:grid-cols-2 max-[540px]:grid-cols-1"
      >
        {/* Card 1: All-Time Cash Left */}
        <div className={cx(card, "p-4")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#5d7f9d]">
              All-time cash left
            </span>
            <span className={pill(treasury.balance >= 0 ? "ok" : "danger")}>
              {treasury.balance >= 0 ? "Healthy" : "Deficit"}
            </span>
          </div>
          <div className="mt-2 font-display text-xl font-extrabold tracking-[-0.5px] text-[#183e6b]">
            {formatIDR(treasury.balance)}
          </div>
          <div className="mt-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#f3dede]">
              <div
                className="h-full bg-ok transition-all duration-300"
                style={{ width: `${incomeRatioPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-bold text-muted">
              <span className="text-ok">In {incomeRatioPct}%</span>
              <span className="text-[#b5524f]">
                Out {allTimeVolume > 0 ? 100 - incomeRatioPct : 50}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Period Income */}
        <div className={cx(card, "p-4")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#5d7f9d]">
              Period income
            </span>
            <span className={pill("ok")}>
              {treasury.periodIncomeCount} tx
            </span>
          </div>
          <div className="mt-2 font-display text-xl font-extrabold tracking-[-0.5px] text-ok">
            +{formatIDR(treasury.periodIncome)}
          </div>
          <div className="mt-2 truncate text-[11px] text-muted">
            {periodRange.label}
          </div>
        </div>

        {/* Card 3: Period Spent */}
        <div className={cx(card, "p-4")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#5d7f9d]">
              Period spent
            </span>
            <span className={pill("warn")}>
              {treasury.periodExpenseCount} tx
            </span>
          </div>
          <div className="mt-2 font-display text-xl font-extrabold tracking-[-0.5px] text-[#b5524f]">
            −{formatIDR(treasury.periodExpense)}
          </div>
          <div className="mt-2 truncate text-[11px] text-muted">
            {periodRange.label}
          </div>
        </div>

        {/* Card 4: Period Net Cashflow */}
        <div className={cx(card, "p-4")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#5d7f9d]">
              Period net flow
            </span>
            <span
              className={pill(
                treasury.periodNet > 0
                  ? "ok"
                  : treasury.periodNet < 0
                    ? "warn"
                    : "default",
              )}
            >
              {treasury.periodNet > 0
                ? "Surplus"
                : treasury.periodNet < 0
                  ? "Net spend"
                  : "Even"}
            </span>
          </div>
          <div
            className={cx(
              "mt-2 font-display text-xl font-extrabold tracking-[-0.5px]",
              treasury.periodNet > 0
                ? "text-ok"
                : treasury.periodNet < 0
                  ? "text-[#b5524f]"
                  : "text-[#183e6b]",
            )}
          >
            {treasury.periodNet > 0 ? "+" : treasury.periodNet < 0 ? "−" : ""}
            {formatIDR(Math.abs(treasury.periodNet))}
          </div>
          <div className="mt-2 truncate text-[11px] text-muted">
            {treasury.periodIncomeCount + treasury.periodExpenseCount} matching
            entries
          </div>
        </div>
      </section>

      {/* Monthly Cashflow Breakdown Chart */}
      <MonthlyCashflowCard
        monthly={treasury.monthly}
        activeMonth={preset === "month" ? selectedMonth : undefined}
        onSelectMonth={handleSelectMonthFromChart}
      />

      {/* Filter & Transactions Table Card */}
      <section className={card} aria-labelledby="entries-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="entries-title">
              Transactions
            </h2>
            <div className={sub}>
              Filter by periodical preset, month, entry type, or keyword.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fetching && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]"
                aria-live="polite"
              >
                <span className={spinner} />
                Updating…
              </span>
            )}
            <span className={pill("default")}>
              {treasury.totalEntries} entr
              {treasury.totalEntries === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>

        {/* Periodical & Search Filter Toolbar */}
        <div className="border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Period preset pills */}
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Time period filter"
            >
              {presetOptions.map((opt) => {
                const active = preset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPreset(opt.id);
                      setPage(1);
                    }}
                    className={cx(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-colors",
                      active
                        ? "bg-[#204a74] text-white shadow-[0_2px_6px_#204a7426]"
                        : "border border-[#dcebf8] bg-white text-[#4c789c] hover:bg-[#f0f7fe]",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={cx(linkBtn, "text-[#b5524f] hover:underline")}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Secondary controls: Month stepper / Custom dates + Type + Search */}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {preset === "month" && (
              <div className="flex items-center gap-1 rounded-xl border border-[#d9eafa] bg-white px-2 py-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="rounded-lg px-2 py-1 text-xs font-extrabold text-[#3c78aa] hover:bg-[#f2f8fe]"
                  onClick={() => {
                    setSelectedMonth((m) => shiftMonth(m, -1));
                    setPage(1);
                  }}
                >
                  ◀
                </button>
                <input
                  type="month"
                  aria-label="Select month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      setPage(1);
                    }
                  }}
                  className="bg-transparent px-1.5 py-0.5 text-xs font-extrabold text-[#204a74] outline-none"
                />
                <button
                  type="button"
                  aria-label="Next month"
                  className="rounded-lg px-2 py-1 text-xs font-extrabold text-[#3c78aa] hover:bg-[#f2f8fe]"
                  onClick={() => {
                    setSelectedMonth((m) => shiftMonth(m, 1));
                    setPage(1);
                  }}
                >
                  ▶
                </button>
              </div>
            )}

            {preset === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
                  />
                </label>
              </div>
            )}

            {/* Type segmented control */}
            <div
              className="inline-flex rounded-xl border border-[#d9eafa] bg-white p-0.5"
              role="group"
              aria-label="Transaction type filter"
            >
              {(
                [
                  { id: "ALL", label: "All types" },
                  { id: "INCOME", label: "Income" },
                  { id: "EXPENSE", label: "Spent" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t.id);
                    setPage(1);
                  }}
                  className={cx(
                    "rounded-[9px] px-2.5 py-1 text-[11px] font-extrabold transition-colors",
                    typeFilter === t.id
                      ? "bg-[#eaf5ff] text-[#204a74]"
                      : "text-[#6b8bab] hover:text-[#204a74]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative min-w-[200px] flex-1">
              <input
                type="search"
                placeholder="Search purpose (e.g. shuttlecock, court fee)…"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className={cx(fieldInput, "py-1.5 text-xs")}
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {treasury.entries.length === 0 ? (
          <div className={empty}>
            {hasActiveFilters
              ? "No treasury entries match your current filter. Try adjusting the period or clearing the search."
              : "No treasury entries yet. Use “＋ Add spent” or “＋ Add income” to start tracking."}
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
                {treasury.entries.map((entry) => {
                  const isDeleting = deletingId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className={cx(
                        "transition-opacity hover:bg-[#f9fcff]",
                        isDeleting && "opacity-50",
                      )}
                    >
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
                            disabled={isDeleting}
                            onClick={() => onEdit(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className={cx(linkBtn, "text-[#b5524f]")}
                            disabled={isDeleting}
                            onClick={() => setConfirmEntry(entry)}
                          >
                            {isDeleting ? (
                              <>
                                <span className={cx(spinner, "mr-1")} />
                                Deleting…
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          className={cx(
            cardFoot,
            "flex-wrap gap-3 bg-[#fafdff]",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {treasury.totalEntries === 0
                ? "Showing 0 entries"
                : `Showing ${startRow}–${endRow} of ${treasury.totalEntries} entries`}
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
              Rows
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={cx(selectInput, "px-2 py-1 text-[11px]")}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(
                btn("light", "sm"),
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              disabled={treasury.page <= 1 || fetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span className="px-1.5 font-extrabold text-[#204a74]">
              Page {treasury.page} of {treasury.totalPages}
            </span>
            <button
              type="button"
              className={cx(
                btn("light", "sm"),
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              disabled={treasury.page >= treasury.totalPages || fetching}
              onClick={() =>
                setPage((p) => Math.min(treasury.totalPages, p + 1))
              }
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {confirmEntry && (
        <ConfirmDialog
          title="Delete treasury entry?"
          description={`Soft-delete “${confirmEntry.purpose}” (${formatIDR(confirmEntry.amount)})? This will immediately adjust the club treasury balance.`}
          confirmLabel="Delete entry"
          busy={deletingId === confirmEntry.id}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setConfirmEntry(null)}
        />
      )}
    </>
  );
}

function MonthlyCashflowCard({
  monthly,
  activeMonth,
  onSelectMonth,
}: {
  monthly: TreasuryMonthlyBucket[];
  activeMonth?: string;
  onSelectMonth: (ym: string) => void;
}) {
  if (!monthly.length) return null;

  const maxAmount = Math.max(
    1,
    ...monthly.map((m) => Math.max(m.income, m.expense)),
  );

  return (
    <section
      className={cx(card, "mb-5")}
      aria-labelledby="monthly-cashflow-title"
    >
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="monthly-cashflow-title">
            Monthly cashflow (last 6 months)
          </h2>
          <div className={sub}>
            Click any month column to filter transactions for that period.
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-ok" />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-[#d97b78]" />
            Spent
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2.5 border-t border-[#eef4f9] px-[22px] py-4 max-[860px]:grid-cols-3 max-[860px]:px-[15px] max-[480px]:grid-cols-2">
        {monthly.map((bucket) => {
          const isSelected = activeMonth === bucket.month;
          const incPct =
            bucket.income > 0
              ? Math.max(6, Math.round((bucket.income / maxAmount) * 100))
              : 0;
          const expPct =
            bucket.expense > 0
              ? Math.max(6, Math.round((bucket.expense / maxAmount) * 100))
              : 0;
          const net = bucket.income - bucket.expense;

          return (
            <button
              key={bucket.month}
              type="button"
              onClick={() => onSelectMonth(bucket.month)}
              className={cx(
                "flex flex-col justify-between rounded-2xl border p-3 text-left transition-all",
                isSelected
                  ? "border-[#589edb] bg-[#f0f8ff] shadow-[0_4px_12px_#589edb24]"
                  : "border-[#e8f1fa] bg-[#fbfdff] hover:border-[#cbe2f6] hover:bg-[#f4faff]",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-[#204a74]">
                  {fmtMonth(bucket.month)}
                </span>
                {isSelected && (
                  <span className="rounded-md bg-[#204a74] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    Active
                  </span>
                )}
              </div>

              {/* Dual Bar Visual */}
              <div className="my-3 flex h-16 items-end justify-center gap-2 border-b border-[#e5eff8] px-2 pt-2">
                <div className="flex h-full flex-1 flex-col justify-end">
                  <div
                    title={`Income: ${formatIDR(bucket.income)}`}
                    className="w-full rounded-t-md bg-ok transition-all duration-300"
                    style={{ height: `${incPct}%` }}
                  />
                </div>
                <div className="flex h-full flex-1 flex-col justify-end">
                  <div
                    title={`Spent: ${formatIDR(bucket.expense)}`}
                    className="w-full rounded-t-md bg-[#d97b78] transition-all duration-300"
                    style={{ height: `${expPct}%` }}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between font-bold text-ok">
                  <span>In</span>
                  <span className=" truncate">{formatIDR(bucket.income)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#b5524f]">
                  <span>Out</span>
                  <span className="truncate">{formatIDR(bucket.expense)}</span>
                </div>
                <div className="flex justify-between border-t border-[#eef4f9] pt-1 font-extrabold text-[#204a74]">
                  <span>Net</span>
                  <span
                    className={cx(
                      "truncate",
                      net > 0
                        ? "text-ok"
                        : net < 0
                          ? "text-[#b5524f]"
                          : "text-muted",
                    )}
                  >
                    {net > 0 ? "+" : net < 0 ? "−" : ""}
                    {formatIDR(Math.abs(net))}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

