"use client";

import type { Dispatch, SetStateAction } from "react";
import { TablePagination } from "@/components/ui/TablePagination";
import type { EntryType, TreasuryEntry, TreasurySummary } from "@/lib/types";
import { card, cardHead, cardTitle, pill, spinner, sub } from "@/lib/ui";
import type { PeriodPreset } from "./period";
import { TransactionsTable } from "./TransactionsTable";
import { TreasuryFilterToolbar } from "./TreasuryFilterToolbar";

export function TransactionsCard({
  treasury,
  fetching,
  isSuperadmin,
  deletingId,
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
  searchText,
  setSearchText,
  setPage,
  pageSize,
  setPageSize,
  hasActiveFilters,
  onResetFilters,
  onEdit,
  onRequestDelete,
}: {
  treasury: TreasurySummary;
  fetching: boolean;
  isSuperadmin: boolean;
  deletingId: string | null;
  preset: PeriodPreset;
  setPreset: (preset: PeriodPreset) => void;
  selectedMonth: string;
  setSelectedMonth: Dispatch<SetStateAction<string>>;
  customFrom: string;
  setCustomFrom: (value: string) => void;
  customTo: string;
  setCustomTo: (value: string) => void;
  typeFilter: "ALL" | EntryType;
  setTypeFilter: (type: "ALL" | EntryType) => void;
  searchText: string;
  setSearchText: (value: string) => void;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: (n: number) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onEdit: (entry: TreasuryEntry) => void;
  onRequestDelete: (entry: TreasuryEntry) => void;
}) {
  return (
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

      <TreasuryFilterToolbar
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
        searchText={searchText}
        setSearchText={setSearchText}
        setPage={setPage}
        hasActiveFilters={hasActiveFilters}
        onReset={onResetFilters}
      />

      <TransactionsTable
        entries={treasury.entries}
        hasActiveFilters={hasActiveFilters}
        isSuperadmin={isSuperadmin}
        deletingId={deletingId}
        onEdit={onEdit}
        onRequestDelete={onRequestDelete}
      />

      <TablePagination
        noun="entries"
        total={treasury.totalEntries}
        page={treasury.page}
        pageSize={treasury.pageSize}
        rowsPerPage={pageSize}
        totalPages={treasury.totalPages}
        fetching={fetching}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(treasury.totalPages, p + 1))}
      />
    </section>
  );
}

