export function pad2(n: number): string {
  return String(n).padStart(2, "0");
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

