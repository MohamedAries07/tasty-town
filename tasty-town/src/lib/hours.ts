export type HoursRow = { day_of_week: number | null; special_date: string | null; opens_at: string | null; closes_at: string | null; is_closed: boolean; note?: string | null };
export type StoreStatus = { open: boolean; message: string };

function ist(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, dow, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
const toMin = (t: string) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };

export type StoreConfig = { ordersEnabled: boolean; override: "auto" | "open" | "closed"; closedMessage: string };

/** Open/closed in Asia/Kolkata. Special dates beat weekly rows. No hours configured means open. */
export function getStoreStatus(cfg: StoreConfig, rows: HoursRow[], now: Date): StoreStatus {
  const closedMsg = cfg.closedMessage || "We're closed right now. Please check back soon.";
  if (!cfg.ordersEnabled) return { open: false, message: closedMsg };
  if (cfg.override === "closed") return { open: false, message: closedMsg };
  if (cfg.override === "open") return { open: true, message: "" };
  if (rows.length === 0) return { open: true, message: "" };

  const t = ist(now);
  const special = rows.find((r) => r.special_date === t.date);
  const weekly = rows.filter((r) => r.day_of_week !== null);
  const yesterday = weekly.find((r) => r.day_of_week === (t.dow + 6) % 7);
  const today = special ?? weekly.find((r) => r.day_of_week === t.dow);

  if (today && !today.is_closed && today.opens_at && today.closes_at) {
    const o = toMin(today.opens_at), c = toMin(today.closes_at);
    if (c > o ? t.minutes >= o && t.minutes < c : t.minutes >= o) return { open: true, message: "" };
  }
  // Overnight hours from yesterday spill past midnight.
  if (!special && yesterday && !yesterday.is_closed && yesterday.opens_at && yesterday.closes_at) {
    const o = toMin(yesterday.opens_at), c = toMin(yesterday.closes_at);
    if (c <= o && t.minutes < c) return { open: true, message: "" };
  }
  return { open: false, message: special?.note || closedMsg };
}
