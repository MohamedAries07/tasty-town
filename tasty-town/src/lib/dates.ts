const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (s: string) => DATE.test(s) && !Number.isNaN(new Date(`${s}T00:00:00+05:30`).getTime());

export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** Inclusive IST dates -> [startISO, endISO) in UTC. */
export function istRange(from: string, to: string) {
  return { startISO: new Date(`${from}T00:00:00+05:30`).toISOString(), endISO: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString() };
}
/** "2026-11-02T10:00" typed by an admin is Indian time. */
export function istLocalToISO(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export function isoToIstLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16);
}
