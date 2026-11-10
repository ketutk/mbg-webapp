"use client";

import { type PeriodPreset, shiftMonth } from "@/lib/date";
import type { EntryType } from "../types";
import { cx, fieldInput, linkBtn } from "@/lib/ui";

const PRESET_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-30", label: "Last 30d" },
  { id: "last-90", label: "Last 90d" },
  { id: "this-year", label: "This year" },
  { id: "month", label: "By month" },
  { id: "custom", label: "Custom range" },
];

export interface TreasuryFilterBarProps {
  preset: PeriodPreset;
  selectedMonth: string;
  customFrom: string;
  customTo: string;
  typeFilter: "ALL" | EntryType;
  searchText: string;
  hasActiveFilters: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onMonthChange: (month: string) => void;
  onCustomFromChange: (from: string) => void;
  onCustomToChange: (to: string) => void;
  onTypeChange: (type: "ALL" | EntryType) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export function TreasuryFilterBar({
  preset,
  selectedMonth,
  customFrom,
  customTo,
  typeFilter,
  searchText,
  hasActiveFilters,
  onPresetChange,
  onMonthChange,
  onCustomFromChange,
  onCustomToChange,
  onTypeChange,
  onSearchChange,
  onReset,
}: TreasuryFilterBarProps) {
  return (
    <div className="border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time period filter">
          {PRESET_OPTIONS.map((opt) => {
            const active = preset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPresetChange(opt.id)}
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
            onClick={onReset}
            className={cx(linkBtn, "text-[#b5524f] hover:underline")}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {preset === "month" && (
          <div className="flex items-center gap-1 rounded-xl border border-[#d9eafa] bg-white px-2 py-1">
            <button
              type="button"
              aria-label="Previous month"
              className="rounded-lg px-2 py-1 text-xs font-extrabold text-[#3c78aa] hover:bg-[#f2f8fe]"
              onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))}
            >
              ◀
            </button>
            <input
              type="month"
              aria-label="Select month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) onMonthChange(e.target.value);
              }}
              className="bg-transparent px-1.5 py-0.5 text-xs font-extrabold text-[#204a74] outline-none"
            />
            <button
              type="button"
              aria-label="Next month"
              className="rounded-lg px-2 py-1 text-xs font-extrabold text-[#3c78aa] hover:bg-[#f2f8fe]"
              onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))}
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
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
              />
            </label>
          </div>
        )}

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
              onClick={() => onTypeChange(t.id)}
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

        <div className="relative min-w-[200px] flex-1">
          <input
            type="search"
            placeholder="Search purpose (e.g. shuttlecock, court fee)…"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cx(fieldInput, "py-1.5 text-xs")}
          />
        </div>
      </div>
    </div>
  );
}

