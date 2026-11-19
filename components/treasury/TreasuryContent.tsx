"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { formatIDR } from "@/lib/format";
import { removeTreasuryEntry, useTreasury } from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { EntryType, TreasuryEntry } from "@/lib/types";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";
import { MonthlyCashflowCard } from "./MonthlyCashflowCard";
import { TransactionsCard } from "./TransactionsCard";
import { TreasuryHero } from "./TreasuryHero";
import { TreasuryKpiCards } from "./TreasuryKpiCards";
import { TreasurySkeleton } from "./TreasurySkeleton";
import { useTreasuryFilters } from "./useTreasuryFilters";

const TreasuryCategoryDialog = dynamic(() =>
  import("./TreasuryCategoryDialog").then((m) => m.TreasuryCategoryDialog),
);

export function TreasuryContent({
  isSuperadmin,
  onAdd,
  onEdit,
}: {
  isSuperadmin: boolean;
  onAdd: (type: EntryType) => void;
  onEdit: (entry: TreasuryEntry) => void;
}) {
  const showToast = useToast();
  const {
    preset,
    setPreset,
    selectedMonth,
    setSelectedMonth,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    searchText,
    setSearchText,
    setPage,
    pageSize,
    setPageSize,
    periodRange,
    filterParams,
    hasActiveFilters,
    resetFilters,
    activeWeekStart,
    handleSelectMonthFromChart,
    handleSelectWeekFromChart,
    handleSelectCategoryFromBreakdown,
  } = useTreasuryFilters();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<TreasuryEntry | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);

  const { data: treasury, loading, fetching } = useTreasury(filterParams);

  if (loading && !treasury) {
    return (
      <>
        <TreasuryHero onAdd={onAdd} />
        <TreasurySkeleton />
      </>
    );
  }

  if (!treasury) return null;

  async function handleConfirmDelete() {
    if (!confirmEntry) return;
    setDeletingId(confirmEntry.id);
    try {
      await removeTreasuryEntry(confirmEntry.id);
      setConfirmEntry(null);
      showToast("Treasury entry deleted");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <TreasuryHero treasury={treasury} onAdd={onAdd} />

      <TreasuryKpiCards treasury={treasury} periodLabel={periodRange.label} />

      <MonthlyCashflowCard
        monthly={treasury.monthly}
        weekly={treasury.weekly}
        activeMonth={preset === "month" ? selectedMonth : undefined}
        activeWeekStart={activeWeekStart}
        onSelectMonth={handleSelectMonthFromChart}
        onSelectWeek={handleSelectWeekFromChart}
      />

      <CategoryBreakdownCard
        breakdown={treasury.categoryBreakdown}
        periodLabel={periodRange.label}
        activeCategoryId={categoryFilter}
        onSelectCategory={handleSelectCategoryFromBreakdown}
        onManageCategories={() => setManagingCategories(true)}
      />

      <TransactionsCard
        treasury={treasury}
        fetching={fetching}
        isSuperadmin={isSuperadmin}
        deletingId={deletingId}
        preset={preset}
        setPreset={setPreset}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchText={searchText}
        setSearchText={setSearchText}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onEdit={onEdit}
        onRequestDelete={setConfirmEntry}
      />

      {managingCategories && (
        <TreasuryCategoryDialog
          onClose={() => setManagingCategories(false)}
          onSaved={showToast}
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
    </>
  );
}
