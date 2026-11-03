import { isDate, todayIST } from "./dates.ts";
import { daysBetween, MAX_RANGE_DAYS, presetRange, type Preset } from "./report.ts";

export const PRESETS: [Preset, string][] = [["today", "Today"], ["yesterday", "Yesterday"], ["this_month", "This month"], ["last_month", "Last month"]];

/** Reads ?preset= or ?from=&to= from the URL, defaulting to today and never exceeding the maximum range. */
export function resolveRange(sp: { preset?: string; from?: string; to?: string }, now = new Date()) {
  const today = todayIST(now);
  const p = PRESETS.find(([k]) => k === sp.preset)?.[0];
  if (p) return { ...presetRange(p, today), preset: p as Preset | null, error: null as string | null };
  if (sp.from && isDate(sp.from)) {
    const to = sp.to && isDate(sp.to) ? sp.to : sp.from;
    if (to < sp.from) return { from: today, to: today, preset: "today" as Preset | null, error: "The end date is before the start date." };
    if (daysBetween(sp.from, to) > MAX_RANGE_DAYS) return { from: today, to: today, preset: "today" as Preset | null, error: `Choose a range of ${MAX_RANGE_DAYS} days or less.` };
    return { from: sp.from, to, preset: null as Preset | null, error: null as string | null };
  }
  return { ...presetRange("today", today), preset: "today" as Preset | null, error: null as string | null };
}
