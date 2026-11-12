import { addDaysISO, getMonthRange, shiftMonth } from "@/lib/date";
import { fmtDate, fmtMonth, todayISO } from "@/lib/format";

export type PeriodPreset =
  | "all"
  | "this-month"
  | "last-month"
  | "last-30"
  | "last-90"
  | "this-year"
  | "month"
  | "custom";

export const PRESET_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-30", label: "Last 30d" },
  { id: "last-90", label: "Last 90d" },
  { id: "this-year", label: "This year" },
  { id: "month", label: "By month" },
  { id: "custom", label: "Custom range" },
];

export function computePresetDates(
  preset: PeriodPreset,
  selectedMonth: string,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string; label: string } {
  const today = todayISO();
  const currentYm = today.slice(0, 7);

  switch (preset) {
    case "all":
      return { label: "All time" };
    case "this-month": {
      const r = getMonthRange(currentYm);
      return { ...r, label: `This month (${fmtMonth(currentYm)})` };
    }
    case "last-month": {
      const prevYm = shiftMonth(currentYm, -1);
      const r = getMonthRange(prevYm);
      return { ...r, label: `Last month (${fmtMonth(prevYm)})` };
    }
    case "last-30":
      return {
        from: addDaysISO(today, -29),
        to: today,
        label: "Last 30 days",
      };
    case "last-90":
      return {
        from: addDaysISO(today, -89),
        to: today,
        label: "Last 90 days",
      };
    case "this-year": {
      const year = today.slice(0, 4);
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        label: `Year ${year}`,
      };
    }
    case "month": {
      const r = getMonthRange(selectedMonth);
      return { ...r, label: fmtMonth(selectedMonth) };
    }
    case "custom":
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
        label:
          customFrom && customTo
            ? `${fmtDate(customFrom)} – ${fmtDate(customTo)}`
            : customFrom
              ? `From ${fmtDate(customFrom)}`
              : customTo
                ? `Until ${fmtDate(customTo)}`
                : "Custom range",
      };
  }
}
