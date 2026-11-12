"use client";

import { formatIDR } from "@/lib/format";
import type { TreasurySummary } from "@/lib/types";
import { card, cx, pill } from "@/lib/ui";

export function TreasuryKpiCards({
  treasury,
  periodLabel,
}: {
  treasury: TreasurySummary;
  periodLabel: string;
}) {
  const allTimeVolume = treasury.income + treasury.expense;
  const incomeRatioPct =
    allTimeVolume > 0 ? Math.round((treasury.income / allTimeVolume) * 100) : 50;

  return (
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
          <span className={pill("ok")}>{treasury.periodIncomeCount} tx</span>
        </div>
        <div className="mt-2 font-display text-xl font-extrabold tracking-[-0.5px] text-ok">
          +{formatIDR(treasury.periodIncome)}
        </div>
        <div className="mt-2 truncate text-[11px] text-muted">
          {periodLabel}
        </div>
      </div>

      {/* Card 3: Period Spent */}
      <div className={cx(card, "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-[#5d7f9d]">
            Period spent
          </span>
          <span className={pill("warn")}>{treasury.periodExpenseCount} tx</span>
        </div>
        <div className="mt-2 font-display text-xl font-extrabold tracking-[-0.5px] text-[#b5524f]">
          −{formatIDR(treasury.periodExpense)}
        </div>
        <div className="mt-2 truncate text-[11px] text-muted">
          {periodLabel}
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
  );
}

