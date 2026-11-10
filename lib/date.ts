export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fmtDate(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtMonth(ym: string): string {
  return new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMonthRange(ym: string): { from: string; to: string } {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr) || new Date().getFullYear();
  const m = Number(mStr) || 1;
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${pad2(m)}-01`,
    to: `${y}-${pad2(m)}-${pad2(lastDay)}`,
  };
}

export function shiftMonth(ym: string, delta: number): string {
  const [yStr, mStr] = ym.split("-");
  const d = new Date(Number(yStr) || 2026, (Number(mStr) || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function addDaysISO(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export type PeriodPreset =
  | "all"
  | "this-month"
  | "last-month"
  | "last-30"
  | "last-90"
  | "this-year"
  | "month"
  | "custom";

function resolveCustomLabel(from: string, to: string): string {
  if (from && to) return `${fmtDate(from)} – ${fmtDate(to)}`;
  if (from) return `From ${fmtDate(from)}`;
  if (to) return `Until ${fmtDate(to)}`;
  return "Custom range";
}

const PRESET_RESOLVERS: Record<
  PeriodPreset,
  (options?: { month?: string; from?: string; to?: string }) => { from?: string; to?: string; label: string }
> = {
  all: () => ({ label: "All time" }),
  "this-month": () => {
    const ym = todayISO().slice(0, 7);
    return { ...getMonthRange(ym), label: `This month (${fmtMonth(ym)})` };
  },
  "last-month": () => {
    const prevYm = shiftMonth(todayISO().slice(0, 7), -1);
    return { ...getMonthRange(prevYm), label: `Last month (${fmtMonth(prevYm)})` };
  },
  "last-30": () => ({
    from: addDaysISO(todayISO(), -29),
    to: todayISO(),
    label: "Last 30 days",
  }),
  "last-90": () => ({
    from: addDaysISO(todayISO(), -89),
    to: todayISO(),
    label: "Last 90 days",
  }),
  "this-year": () => {
    const year = todayISO().slice(0, 4);
    return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Year ${year}` };
  },
  month: (options) => {
    const m = options?.month || todayISO().slice(0, 7);
    return { ...getMonthRange(m), label: fmtMonth(m) };
  },
  custom: (options) => ({
    from: options?.from || undefined,
    to: options?.to || undefined,
    label: resolveCustomLabel(options?.from || "", options?.to || ""),
  }),
};

export function resolvePeriod(
  preset: PeriodPreset,
  options?: { month?: string; from?: string; to?: string },
): { from?: string; to?: string; label: string } {
  const resolver = PRESET_RESOLVERS[preset] ?? PRESET_RESOLVERS.all;
  return resolver(options);
}
