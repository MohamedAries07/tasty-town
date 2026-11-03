export type Summary = { requests: number; pending: number; received: number; confirmed: number; completed: number; cancelled: number;
  confirmed_revenue: number; recognised_revenue: number; discounts: number; delivery_fees: number };
export type Day = { d: string; requests: number; confirmed: number; completed: number; cancelled: number; confirmed_revenue: number; recognised_revenue: number };
export type Hour = { h: number; requests: number; confirmed: number };
export type TypeRow = { order_type: "delivery" | "takeaway"; requests: number; confirmed: number; confirmed_revenue: number };
export type NamedRow = { name: string; quantity: number; revenue: number };
export type Report = { summary: Summary; daily: Day[]; hourly: Hour[]; by_type: TypeRow[]; top_products: NamedRow[]; categories: NamedRow[] };

export const MAX_RANGE_DAYS = 366;
const DAY = 86_400_000;
const utc = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function daysBetween(from: string, to: string) { return Math.round((utc(to) - utc(from)) / DAY) + 1; }

/** Fills days with no orders so charts show gaps honestly. */
export function fillDays(from: string, to: string, rows: Day[]): Day[] {
  const m = new Map(rows.map((r) => [r.d, r]));
  const out: Day[] = [];
  for (let t = utc(from); t <= utc(to); t += DAY) {
    const d = iso(t);
    out.push(m.get(d) ?? { d, requests: 0, confirmed: 0, completed: 0, cancelled: 0, confirmed_revenue: 0, recognised_revenue: 0 });
  }
  return out;
}
export function fillHours(rows: Hour[]): Hour[] {
  const m = new Map(rows.map((r) => [r.h, r]));
  return Array.from({ length: 24 }, (_, h) => m.get(h) ?? { h, requests: 0, confirmed: 0 });
}
export const cancellationRate = (s: Summary): number | null => (s.requests ? Math.round((s.cancelled / s.requests) * 1000) / 10 : null);
export const averageOrder = (s: Summary): number => (s.confirmed ? Math.round(s.confirmed_revenue / s.confirmed) : 0);

export type Preset = "today" | "yesterday" | "this_month" | "last_month";
export function presetRange(p: Preset, today: string): { from: string; to: string } {
  if (p === "today") return { from: today, to: today };
  if (p === "yesterday") { const y = iso(utc(today) - DAY); return { from: y, to: y }; }
  const [yr, mo] = today.split("-").map(Number);
  if (p === "this_month") return { from: `${yr}-${String(mo).padStart(2, "0")}-01`, to: today };
  const lastEnd = iso(Date.UTC(yr, mo - 1, 1) - DAY);
  return { from: `${lastEnd.slice(0, 8)}01`, to: lastEnd };
}
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

// ---- CSV -------------------------------------------------------------------
export const rupees = (paise: number) => (paise / 100).toFixed(2);
/** Quotes cells and neutralises spreadsheet formulas (=, +, -, @) in text from customers. */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows: (string | number)[][]) => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export function summaryCsv(r: Report, from: string, to: string) {
  const s = r.summary;
  return toCsv([["Metric", "Value"], ["Period", `${from} to ${to}`], ["Order requests", s.requests], ["Pending WhatsApp", s.pending], ["Received", s.received], ["Confirmed orders", s.confirmed],
    ["Completed orders", s.completed], ["Cancelled orders", s.cancelled], ["Cancellation rate %", cancellationRate(s) ?? ""], ["Confirmed revenue (INR)", rupees(s.confirmed_revenue)],
    ["Recognised revenue: completed and paid (INR)", rupees(s.recognised_revenue)], ["Average confirmed order (INR)", rupees(averageOrder(s))], ["Discounts given (INR)", rupees(s.discounts)]]);
}
export function dailyCsv(days: Day[]) {
  return toCsv([["Date", "Order requests", "Confirmed", "Completed", "Cancelled", "Confirmed revenue (INR)", "Recognised revenue (INR)"],
    ...days.map((d) => [d.d, d.requests, d.confirmed, d.completed, d.cancelled, rupees(d.confirmed_revenue), rupees(d.recognised_revenue)])]);
}
export function productsCsv(r: Report) {
  return toCsv([["Type", "Name", "Quantity", "Revenue (INR)"], ...r.top_products.map((p) => ["Product", p.name, p.quantity, rupees(p.revenue)]), ...r.categories.map((c) => ["Category", c.name, c.quantity, rupees(c.revenue)])]);
}
