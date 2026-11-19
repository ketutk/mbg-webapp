"use client";

import { formatIDR } from "@/lib/format";
import type { TreasuryCategoryBreakdown } from "@/lib/types";
import { btn, card, cardHead, cardTitle, cx, emptySmall, pill, sub } from "@/lib/ui";

export function CategoryBreakdownCard({
  breakdown,
  periodLabel,
  activeCategoryId,
  onSelectCategory,
  onManageCategories,
}: {
  breakdown: TreasuryCategoryBreakdown[];
  periodLabel: string;
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onManageCategories: () => void;
}) {
  const expenseItems = breakdown.filter((b) => b.type === "EXPENSE");
  const incomeItems = breakdown.filter((b) => b.type === "INCOME");
  const totalSpent = expenseItems.reduce((sum, b) => sum + b.total, 0);
  const totalIncome = incomeItems.reduce((sum, b) => sum + b.total, 0);

  return (
    <section
      className={cx(card, "mb-5")}
      aria-labelledby="category-breakdown-title"
    >
      <div className={cx(cardHead, "flex-wrap items-center")}>
        <div>
          <h2 className={cardTitle} id="category-breakdown-title">
            Breakdown by category
          </h2>
          <div className={sub}>
            Totals for {periodLabel}. Click any category to filter transactions
            below.
          </div>
        </div>
        <button
          type="button"
          id="manage-categories-btn"
          className={btn("light", "sm")}
          onClick={onManageCategories}
        >
          ＋ Manage categories
        </button>
      </div>

      <div className="grid grid-cols-2 border-t border-[#eef4f9] max-[860px]:grid-cols-1">
        {/* Left: Spent by category */}
        <div className="border-r border-[#eef4f9] p-5 max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#204a74]">
              Spent by category
            </span>
            <span className={pill("warn")}>{formatIDR(totalSpent)}</span>
          </div>

          {expenseItems.length === 0 ? (
            <div className={emptySmall}>No spent entries in this period.</div>
          ) : (
            <div className="space-y-2">
              {expenseItems.map((item) => {
                const pct =
                  totalSpent > 0
                    ? Math.round((item.total / totalSpent) * 100)
                    : 0;
                const isActive =
                  Boolean(item.categoryId) &&
                  activeCategoryId === item.categoryId;
                return (
                  <button
                    key={`${item.type}:${item.categoryId ?? "none"}`}
                    type="button"
                    disabled={!item.categoryId}
                    onClick={() =>
                      item.categoryId && onSelectCategory(item.categoryId)
                    }
                    className={cx(
                      "w-full rounded-xl border p-2.5 text-left transition-all",
                      isActive
                        ? "border-[#589edb] bg-[#f0f8ff]"
                        : "border-[#e8f1fa] bg-[#fbfdff] hover:border-[#cbe2f6] hover:bg-[#f4faff]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-extrabold text-[#204a74]">
                        {item.categoryName}
                        <span className="ml-1.5 text-[10px] font-bold text-muted">
                          ({item.count} tx)
                        </span>
                      </span>
                      <span className="shrink-0 font-display font-extrabold text-[#b5524f]">
                        {formatIDR(item.total)}{" "}
                        <span className="text-[10px] font-bold text-muted">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#f5e3e2]">
                      <div
                        className="h-full rounded-full bg-[#d97b78] transition-all duration-300"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Income by category */}
        <div className="p-5 max-[860px]:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#204a74]">
              Income by category
            </span>
            <span className={pill("ok")}>{formatIDR(totalIncome)}</span>
          </div>

          {incomeItems.length === 0 ? (
            <div className={emptySmall}>No income entries in this period.</div>
          ) : (
            <div className="space-y-2">
              {incomeItems.map((item) => {
                const pct =
                  totalIncome > 0
                    ? Math.round((item.total / totalIncome) * 100)
                    : 0;
                const isActive =
                  Boolean(item.categoryId) &&
                  activeCategoryId === item.categoryId;
                return (
                  <button
                    key={`${item.type}:${item.categoryId ?? "none"}`}
                    type="button"
                    disabled={!item.categoryId}
                    onClick={() =>
                      item.categoryId && onSelectCategory(item.categoryId)
                    }
                    className={cx(
                      "w-full rounded-xl border p-2.5 text-left transition-all",
                      isActive
                        ? "border-[#589edb] bg-[#f0f8ff]"
                        : "border-[#e8f1fa] bg-[#fbfdff] hover:border-[#cbe2f6] hover:bg-[#f4faff]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-extrabold text-[#204a74]">
                        {item.categoryName}
                        <span className="ml-1.5 text-[10px] font-bold text-muted">
                          ({item.count} tx)
                        </span>
                      </span>
                      <span className="shrink-0 font-display font-extrabold text-ok">
                        {formatIDR(item.total)}{" "}
                        <span className="text-[10px] font-bold text-muted">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#dff2ec]">
                      <div
                        className="h-full rounded-full bg-ok transition-all duration-300"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
