"use client";

import { useState } from "react";
import { useAuth, can } from "@/features/auth";
import { formatIDR } from "@/lib/money";
import { toast } from "@/lib/toast";
import type { EntryType, TreasuryEntry } from "../types";
import { useTreasury } from "../queries";
import { useDeleteTreasuryEntry } from "../mutations";
import { useTreasuryFilters } from "../hooks/useTreasuryFilters";
import { BalanceCards } from "../components/BalanceCards";
import { CashflowChart } from "../components/CashflowChart";
import { TreasuryFilterBar } from "../components/TreasuryFilterBar";
import { EntriesTable } from "../components/EntriesTable";
import { AppHeader } from "@/components/AppHeader";
import { ConfirmDialog, Button, Card, Pagination, Pill, Skeleton } from "@/components/ui";
import { LoginDialog } from "@/components/LoginDialog";
import { TreasuryEntryDialog } from "@/components/TreasuryEntryDialog";
import { cardFoot, cardHead, cardTitle, cx, eyebrow, h1, spinner, sub } from "@/lib/ui";

function TreasuryHero({
  balance,
  income,
  expense,
  onAddIncome,
  onAddSpent,
}: {
  balance: number;
  income: number;
  expense: number;
  onAddIncome: () => void;
  onAddSpent: () => void;
}) {
  return (
    <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
      <div>
        <div className={eyebrow}>Club treasury</div>
        <h1 className={h1}>{formatIDR(balance)}</h1>
        <div className="mt-1 text-xs text-muted">
          All-time cash left · Total income {formatIDR(income)} · Total spent {formatIDR(expense)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button id="treasury-add-income" variant="light" onClick={onAddIncome}>
          ＋ Add income
        </Button>
        <Button id="treasury-add" variant="primary" onClick={onAddSpent}>
          ＋ Add spent
        </Button>
      </div>
    </section>
  );
}

export function TreasuryScreen() {
  const { user, loading: authLoading } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [dialogMode, setDialogMode] = useState<{
    initialType?: EntryType;
    editingEntry?: TreasuryEntry;
  } | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<TreasuryEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperadmin = user ? can(user, "treasury:edit") : false;

  const {
    state,
    setters,
    filterParams,
    hasActiveFilters,
    resetFilters,
    handleSelectMonthFromChart,
  } = useTreasuryFilters();

  const { data: treasury, loading, fetching } = useTreasury(filterParams);
  const deleteMutation = useDeleteTreasuryEntry();

  async function handleConfirmDelete() {
    if (!confirmEntry) return;
    setDeletingId(confirmEntry.id);
    try {
      await deleteMutation.mutateAsync(confirmEntry.id);
      setConfirmEntry(null);
      toast.show("Treasury entry deleted");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader active="treasury" user={user} onToast={toast.show} />

      <main>
        {authLoading || (loading && !treasury) ? (
          <Skeleton className="mt-8 h-80" />
        ) : !treasury ? null : (
          <>
            <TreasuryHero
              balance={treasury.balance}
              income={treasury.income}
              expense={treasury.expense}
              onAddIncome={() => setDialogMode({ initialType: "INCOME" })}
              onAddSpent={() => setDialogMode({ initialType: "EXPENSE" })}
            />

            <BalanceCards treasury={treasury} periodLabel={state.periodRange.label} />

            <CashflowChart
              monthly={treasury.monthly}
              activeMonth={state.preset === "month" ? state.selectedMonth : undefined}
              onSelectMonth={handleSelectMonthFromChart}
            />

            <Card aria-labelledby="entries-title">
              <div className={cardHead}>
                <div>
                  <h2 className={cardTitle} id="entries-title">Transactions</h2>
                  <div className={sub}>Filter by periodical preset, month, entry type, or keyword.</div>
                </div>
                <div className="flex items-center gap-2">
                  {fetching && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]" aria-live="polite">
                      <span className={spinner} /> Updating…
                    </span>
                  )}
                  <Pill variant="default">
                    {treasury.totalEntries} entr{treasury.totalEntries === 1 ? "y" : "ies"}
                  </Pill>
                </div>
              </div>

              <TreasuryFilterBar
                preset={state.preset}
                selectedMonth={state.selectedMonth}
                customFrom={state.customFrom}
                customTo={state.customTo}
                typeFilter={state.typeFilter}
                searchText={state.searchText}
                hasActiveFilters={hasActiveFilters}
                onPresetChange={setters.setPreset}
                onMonthChange={(m) => { setters.setSelectedMonth(m); setters.setPage(1); }}
                onCustomFromChange={(from) => { setters.setCustomFrom(from); setters.setPage(1); }}
                onCustomToChange={(to) => { setters.setCustomTo(to); setters.setPage(1); }}
                onTypeChange={(t) => { setters.setTypeFilter(t); setters.setPage(1); }}
                onSearchChange={(q) => { setters.setSearchText(q); setters.setPage(1); }}
                onReset={resetFilters}
              />

              <EntriesTable
                entries={treasury.entries}
                isSuperadmin={isSuperadmin}
                deletingId={deletingId}
                hasActiveFilters={hasActiveFilters}
                onEdit={(entry) => setDialogMode({ editingEntry: entry })}
                onDelete={(entry) => setConfirmEntry(entry)}
              />

              <div className={cx(cardFoot, "flex-wrap gap-3 bg-[#fafdff]")}>
                <Pagination
                  page={treasury.page}
                  totalPages={treasury.totalPages}
                  pageSize={treasury.pageSize}
                  totalEntries={treasury.totalEntries}
                  entryLabel="entries"
                  pageSizeOptions={[10, 25, 50]}
                  isPending={fetching}
                  onPageChange={setters.setPage}
                  onPageSizeChange={(ps) => {
                    setters.setPageSize(ps);
                    setters.setPage(1);
                  }}
                />
              </div>
            </Card>
          </>
        )}
      </main>

      {dialogMode && (
        <TreasuryEntryDialog
          initialType={dialogMode.initialType}
          editingEntry={dialogMode.editingEntry}
          onClose={() => setDialogMode(null)}
          onSaved={toast.show}
        />
      )}

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

      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => toast.show("Logged in")}
        />
      )}
    </div>
  );
}
