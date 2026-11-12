"use client";

import { fmtMonth, todayISO } from "@/lib/format";
import type { SessionStatus } from "@/lib/types";
import { cx, fieldInput, linkBtn } from "@/lib/ui";
import type { PeriodPreset } from "./session-date-range";

export function SessionsFilterToolbar({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  statusFilter,
  setStatusFilter,
  searchText,
  setSearchText,
  setPage,
  hasActiveFilters,
  onReset,
}: {
  preset: PeriodPreset;
  setPreset: (preset: PeriodPreset) => void;
  customFrom: string;
  setCustomFrom: (value: string) => void;
  customTo: string;
  setCustomTo: (value: string) => void;
  statusFilter: "ALL" | SessionStatus;
  setStatusFilter: (status: "ALL" | SessionStatus) => void;
  searchText: string;
  setSearchText: (value: string) => void;
  setPage: (page: number) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  const presetOptions: { id: PeriodPreset; label: string }[] = [
    { id: "all", label: "All dates" },
    { id: "this-month", label: `This month (${fmtMonth(todayISO().slice(0, 7))})` },
    { id: "last-30", label: "Last 30d" },
    { id: "this-year", label: "This year" },
    { id: "custom", label: "Custom range" },
  ];

  return (
    <div className="border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Date range filter"
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
            onClick={onReset}
            className={cx(linkBtn, "text-[#b5524f] hover:underline")}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
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

        <div
          className="inline-flex rounded-xl border border-[#d9eafa] bg-white p-0.5"
          role="group"
          aria-label="Session status filter"
        >
          {(
            [
              { id: "ALL", label: "All status" },
              { id: "OPEN", label: "Open" },
              { id: "CLOSED", label: "Closed" },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setStatusFilter(st.id);
                setPage(1);
              }}
              className={cx(
                "rounded-[9px] px-2.5 py-1 text-[11px] font-extrabold transition-colors",
                statusFilter === st.id
                  ? "bg-[#eaf5ff] text-[#204a74]"
                  : "text-[#6b8bab] hover:text-[#204a74]",
              )}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <input
            type="search"
            placeholder="Search session name (e.g. Minggu pagi)…"
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

