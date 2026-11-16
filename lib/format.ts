const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const formatIDR = (amount: number): string => idrFormatter.format(amount);

export const fmtDate = (d: string): string =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const fmtMonth = (ym: string): string =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

export const fmtShortMonth = (ym: string): string =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
  });

export const fmtShortDayMonth = (d: string): string =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

export function fmtWeekRange(weekStart: string, weekEnd: string): string {
  const startYear = weekStart.slice(0, 4);
  const endYear = weekEnd.slice(0, 4);
  const endLabel = new Date(`${weekEnd}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (startYear === endYear) {
    return `${fmtShortDayMonth(weekStart)} – ${endLabel}`;
  }
  const startLabel = new Date(`${weekStart}T12:00:00`).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
  return `${startLabel} – ${endLabel}`;
}

export function formatCompactIDR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs === 0) return "0";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(2)} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)} Rb`;
  }
  return `${sign}${Math.round(abs)}`;
}


