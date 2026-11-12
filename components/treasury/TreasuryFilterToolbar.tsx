"use client";

import type { Dispatch, SetStateAction } from "react";
import { shiftMonth } from "@/lib/date";
import type { EntryType } from "@/lib/types";
import { cx, fieldInput, linkBtn } from "@/lib/ui";
import { PRESET_OPTIONS, type PeriodPreset } from "./period";

export function TreasuryFilterToolbar({
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
  hasActiveFilters,
  onReset,
}: {
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
  setPage: (page: number) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Period preset pills */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Time period filter"
        >
          {PRESET_OPTIONS.map((opt) => {
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
            onClick={onReset}
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
  );
}

