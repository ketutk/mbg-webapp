"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { SkeletonBar } from "@/components/ui/Skeleton";
import {
  fmtMonth,
  fmtShortDayMonth,
  fmtShortMonth,
  fmtWeekRange,
  formatCompactIDR,
  formatIDR,
} from "@/lib/format";
import type {
  TreasuryMonthlyBucket,
  TreasuryWeeklyBucket,
} from "@/lib/types";
import { card, cardHead, cardTitle, cx, selectInput, sub } from "@/lib/ui";
import type { TreasuryChartPoint } from "./TreasurySplineChart";

type Granularity = "month" | "week";
type MonthWindow = "6m" | "12m" | "ytd";
type WeekWindow = "8w" | "12w" | "16w";
type ViewMode = "line" | "cards";

const TreasurySplineChart = dynamic(
  () => import("./TreasurySplineChart").then((m) => m.TreasurySplineChart),
  {
    ssr: false,
    loading: () => (
      <div>
        <SkeletonBar
          w="w-full"
          h="h-[260px] max-[600px]:h-[220px]"
          className="rounded-2xl"
        />
        <div className="mt-3 flex items-center justify-center gap-5">
          <SkeletonBar w="w-16" h="h-4" />
          <SkeletonBar w="w-16" h="h-4" />
        </div>
      </div>
    ),
  },
);

function sumNet(buckets: { income: number; expense: number }[]): number {
  return buckets.reduce((acc, b) => acc + (b.income - b.expense), 0);
}

function fmtSignedCompact(amount: number): string {
  const formatted = formatCompactIDR(amount);
  return amount > 0 ? `+${formatted}` : formatted;
}

function buildMonthPoints(monthly: TreasuryMonthlyBucket[]): TreasuryChartPoint[] {
  const years = new Set(monthly.map((m) => m.month.slice(0, 4)));
  const multiYear = years.size > 1;
  return monthly.map((m, idx) => {
    const short = fmtShortMonth(m.month);
    const axisLabel =
      multiYear && (idx === 0 || m.month.endsWith("-01"))
        ? `${short} '${m.month.slice(2, 4)}`
        : short;
    return {
      key: m.month,
      axisLabel,
      tooltipTitle: fmtMonth(m.month),
      income: m.income,
      expense: m.expense,
    };
  });
}

function buildWeekPoints(weekly: TreasuryWeeklyBucket[]): TreasuryChartPoint[] {
  return weekly.map((w) => ({
    key: w.weekStart,
    axisLabel: fmtShortDayMonth(w.weekStart),
    tooltipTitle: fmtWeekRange(w.weekStart, w.weekEnd),
    income: w.income,
    expense: w.expense,
  }));
}

export function MonthlyCashflowCard({
  monthly,
  weekly,
  activeMonth,
  activeWeekStart,
  onSelectMonth,
  onSelectWeek,
}: {
  monthly: TreasuryMonthlyBucket[];
  weekly: TreasuryWeeklyBucket[];
  activeMonth?: string;
  activeWeekStart?: string;
  onSelectMonth: (ym: string) => void;
  onSelectWeek: (weekStart: string, weekEnd: string) => void;
}) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [monthWindow, setMonthWindow] = useState<MonthWindow>("6m");
  const [weekWindow, setWeekWindow] = useState<WeekWindow>("8w");
  const [viewMode, setViewMode] = useState<ViewMode>("line");

  const latestYear = useMemo(
    () => monthly[monthly.length - 1]?.month.slice(0, 4) ?? "",
    [monthly],
  );

  const buckets6m = useMemo(() => monthly.slice(-6), [monthly]);
  const bucketsYtd = useMemo(
    () =>
      latestYear
        ? monthly.filter((b) => b.month.startsWith(`${latestYear}-`))
        : monthly,
    [monthly, latestYear],
  );

  const visibleMonthly = useMemo(() => {
    if (monthWindow === "12m") return monthly;
    if (monthWindow === "ytd") return bucketsYtd;
    return buckets6m;
  }, [monthWindow, monthly, buckets6m, bucketsYtd]);

  const buckets8w = useMemo(() => weekly.slice(-8), [weekly]);
  const buckets12w = useMemo(() => weekly.slice(-12), [weekly]);

  const visibleWeekly = useMemo(() => {
    if (weekWindow === "16w") return weekly;
    if (weekWindow === "12w") return buckets12w;
    return buckets8w;
  }, [weekWindow, weekly, buckets12w, buckets8w]);

  const chartPoints = useMemo(
    () =>
      granularity === "week"
        ? buildWeekPoints(visibleWeekly)
        : buildMonthPoints(visibleMonthly),
    [granularity, visibleWeekly, visibleMonthly],
  );

  const matchedActiveWeek = useMemo(
    () =>
      activeWeekStart
        ? weekly.find((w) => w.weekStart === activeWeekStart)
        : undefined,
    [activeWeekStart, weekly],
  );

  if (!monthly.length) return null;

  const net6 = sumNet(buckets6m);
  const net12 = sumNet(monthly);
  const netYtd = sumNet(bucketsYtd);

  const net8w = sumNet(buckets8w);
  const net12w = sumNet(buckets12w);
  const net16w = sumNet(weekly);

  const activeKey =
    granularity === "week" ? matchedActiveWeek?.weekStart : activeMonth;

  const activeFilterBadge = activeMonth
    ? {
        label: fmtMonth(activeMonth),
        onClear: () => onSelectMonth(activeMonth),
      }
    : matchedActiveWeek
      ? {
          label: fmtWeekRange(
            matchedActiveWeek.weekStart,
            matchedActiveWeek.weekEnd,
          ),
          onClear: () =>
            onSelectWeek(
              matchedActiveWeek.weekStart,
              matchedActiveWeek.weekEnd,
            ),
        }
      : null;

  function handleSelectPoint(key: string) {
    if (granularity === "month") {
      onSelectMonth(key);
      return;
    }
    const bucket = weekly.find((w) => w.weekStart === key);
    if (bucket) onSelectWeek(bucket.weekStart, bucket.weekEnd);
  }

  const maxAmount = Math.max(
    1,
    ...chartPoints.map((p) => Math.max(p.income, p.expense)),
  );

  return (
    <section
      className={cx(card, "mb-5")}
      aria-labelledby="monthly-cashflow-title"
    >
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle} id="monthly-cashflow-title">
            Cashflow trend
          </h2>
          <div className={sub}>
            Switch between monthly and weekly buckets, hover to inspect totals,
            or click any point to filter transactions.
          </div>
        </div>
        <div
          className="inline-flex rounded-xl border border-[#deedf9] bg-[#f4faff] p-0.5 text-[11px] font-extrabold"
          role="group"
          aria-label="Chart view mode"
        >
          <button
            type="button"
            onClick={() => setViewMode("line")}
            aria-pressed={viewMode === "line"}
            className={cx(
              "rounded-[9px] px-2.5 py-1 transition-all",
              viewMode === "line"
                ? "bg-white text-[#204a74] shadow-xs"
                : "text-muted hover:text-[#204a74]",
            )}
          >
            Line chart
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            aria-pressed={viewMode === "cards"}
            className={cx(
              "rounded-[9px] px-2.5 py-1 transition-all",
              viewMode === "cards"
                ? "bg-white text-[#204a74] shadow-xs"
                : "text-muted hover:text-[#204a74]",
            )}
          >
            {granularity === "week" ? "Week cards" : "Month cards"}
          </button>
        </div>
      </div>

      {/* Granularity, Period Window Selector & Active Filter Pill */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#eef4f9] bg-[#fbfdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1.5 block text-[11px] font-extrabold text-[#5d7f9d]">
              Group by:
            </span>
            <div
              className="inline-flex rounded-xl border border-[#d9eafa] bg-white p-0.5 text-xs font-extrabold"
              role="group"
              aria-label="Chart grouping"
            >
              <button
                type="button"
                id="treasury-group-month"
                onClick={() => setGranularity("month")}
                aria-pressed={granularity === "month"}
                className={cx(
                  "rounded-[9px] px-3 py-2 transition-all",
                  granularity === "month"
                    ? "bg-[#eaf5ff] text-[#204a74]"
                    : "text-muted hover:text-[#204a74]",
                )}
              >
                By month
              </button>
              <button
                type="button"
                id="treasury-group-week"
                onClick={() => setGranularity("week")}
                aria-pressed={granularity === "week"}
                className={cx(
                  "rounded-[9px] px-3 py-2 transition-all",
                  granularity === "week"
                    ? "bg-[#eaf5ff] text-[#204a74]"
                    : "text-muted hover:text-[#204a74]",
                )}
              >
                By week
              </button>
            </div>
          </div>

          <label className="block min-w-[220px] flex-1">
            <span className="mb-1.5 block text-[11px] font-extrabold text-[#5d7f9d]">
              Period window:
            </span>
            {granularity === "month" ? (
              <select
                id="treasury-chart-range"
                value={monthWindow}
                onChange={(e) => setMonthWindow(e.target.value as MonthWindow)}
                className={cx(selectInput, "w-full max-w-[300px]")}
              >
                <option value="6m">
                  Last 6 months ({fmtSignedCompact(net6)})
                </option>
                <option value="12m">
                  Last 12 months ({fmtSignedCompact(net12)})
                </option>
                {latestYear && (
                  <option value="ytd">
                    Year {latestYear} ({fmtSignedCompact(netYtd)})
                  </option>
                )}
              </select>
            ) : (
              <select
                id="treasury-chart-range"
                value={weekWindow}
                onChange={(e) => setWeekWindow(e.target.value as WeekWindow)}
                className={cx(selectInput, "w-full max-w-[300px]")}
              >
                <option value="8w">
                  Last 8 weeks ({fmtSignedCompact(net8w)})
                </option>
                <option value="12w">
                  Last 12 weeks ({fmtSignedCompact(net12w)})
                </option>
                <option value="16w">
                  Last 16 weeks ({fmtSignedCompact(net16w)})
                </option>
              </select>
            )}
          </label>
        </div>

        {activeFilterBadge && (
          <button
            type="button"
            onClick={activeFilterBadge.onClear}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#589edb] bg-[#eaf5ff] px-3 py-1.5 text-[11px] font-extrabold text-[#204a74] transition-colors hover:bg-[#dceeff]"
          >
            <span>Filtered: {activeFilterBadge.label}</span>
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {viewMode === "line" ? (
        <div className="border-t border-[#eef4f9] px-[22px] py-4 max-[860px]:px-[15px]">
          <TreasurySplineChart
            points={chartPoints}
            activeKey={activeKey}
            onSelectPoint={handleSelectPoint}
          />
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2.5 border-t border-[#eef4f9] px-[22px] py-4 max-[860px]:grid-cols-3 max-[860px]:px-[15px] max-[480px]:grid-cols-2">
          {chartPoints.map((point) => {
            const isSelected = activeKey === point.key;
            const incPct =
              point.income > 0
                ? Math.max(6, Math.round((point.income / maxAmount) * 100))
                : 0;
            const expPct =
              point.expense > 0
                ? Math.max(6, Math.round((point.expense / maxAmount) * 100))
                : 0;
            const net = point.income - point.expense;

            return (
              <button
                key={point.key}
                type="button"
                title={point.tooltipTitle}
                onClick={() => handleSelectPoint(point.key)}
                className={cx(
                  "flex flex-col justify-between rounded-2xl border p-3 text-left transition-all",
                  isSelected
                    ? "border-[#589edb] bg-[#f0f8ff] shadow-[0_4px_12px_#589edb24]"
                    : "border-[#e8f1fa] bg-[#fbfdff] hover:border-[#cbe2f6] hover:bg-[#f4faff]",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-extrabold text-[#204a74]">
                    {granularity === "week"
                      ? `Wk ${point.axisLabel}`
                      : point.tooltipTitle}
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
                      title={`Income: ${formatIDR(point.income)}`}
                      className="w-full rounded-t-md bg-ok transition-all duration-300"
                      style={{ height: `${incPct}%` }}
                    />
                  </div>
                  <div className="flex h-full flex-1 flex-col justify-end">
                    <div
                      title={`Spent: ${formatIDR(point.expense)}`}
                      className="w-full rounded-t-md bg-[#d97b78] transition-all duration-300"
                      style={{ height: `${expPct}%` }}
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold text-ok">
                    <span>In</span>
                    <span className="truncate">{formatIDR(point.income)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#b5524f]">
                    <span>Out</span>
                    <span className="truncate">{formatIDR(point.expense)}</span>
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
      )}
    </section>
  );
}
