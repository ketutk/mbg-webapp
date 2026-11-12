import { addDaysISO, getMonthRange } from "@/lib/date";
import { todayISO } from "@/lib/format";

export type PeriodPreset = "all" | "this-month" | "last-30" | "this-year" | "custom";

export function computeSessionDateRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const today = todayISO();
  const ym = today.slice(0, 7);
  switch (preset) {
    case "all":
      return {};
    case "this-month":
      return getMonthRange(ym);
    case "last-30":
      return { from: addDaysISO(today, -29), to: today };
    case "this-year": {
      const year = today.slice(0, 4);
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case "custom":
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
      };
  }
}
