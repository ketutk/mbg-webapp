"use client";

import { fmtMonth, formatIDR } from "@/lib/format";
import type { TreasuryMonthlyBucket } from "@/lib/types";
import { card, cardHead, cardTitle, cx, sub } from "@/lib/ui";

export function MonthlyCashflowCard({
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
