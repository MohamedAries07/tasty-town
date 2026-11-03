"use server";
import { revalidatePath } from "next/cache";
import { audit, dbError, flag, guard, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { isDate } from "@/lib/dates";
import { contrastRatio } from "@/lib/contrast";
import { parseRupees } from "@/lib/money";
import { normalizeIndianMobile } from "@/lib/phone";
import { SETTINGS } from "@/lib/settings-schema";

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const section = SETTINGS.find((s) => s.id === str(fd, "section")); if (!section) return { error: "Invalid request." };
  const rows: { key: string; value: unknown; is_public: boolean }[] = [];
  for (const f of section.fields) {
    const raw = str(fd, f.key); let v: unknown;
    switch (f.type) {
      case "bool": v = flag(fd, f.key); break;
      case "text": case "textarea": v = raw.slice(0, f.type === "text" ? 200 : 600); break;
      case "rupees": { if (!raw) { v = f.key === "free_delivery_threshold_paise" ? null : 0; break; } const p = parseRupees(raw); if (p === null) return { error: `${f.label}: enter an amount like 30 or 30.50.` }; v = p; break; }
      case "select": if (!f.options!.some(([o]) => o === raw)) return { error: `${f.label}: choose an option.` }; v = raw; break;
      case "whatsapp": { const n = normalizeIndianMobile(raw); if (!n) return { error: "Enter a valid 10-digit Indian mobile number for WhatsApp." }; v = `91${n}`; break; }
      case "url": if (raw && !/^https:\/\/\S+$/.test(raw)) return { error: `${f.label} must start with https://` }; v = raw; break;
      case "color": if (raw && !/^#[0-9a-fA-F]{6}$/.test(raw)) return { error: "Accent colour must look like #B8F52A." };
        if (raw && contrastRatio(raw, "#101010") < 4.5) return { error: "That accent colour is too dark: black text on it would be hard to read. Choose a lighter colour." };
        v = raw; break;
    }
    if (f.key === "pay_cod" || f.key === "pay_pickup") continue;
    rows.push({ key: f.key, value: v, is_public: true });
  }
  if (section.id === "payment") {
    const methods = [...(flag(fd, "pay_cod") ? ["cash_on_delivery"] : []), ...(flag(fd, "pay_pickup") ? ["pay_at_pickup"] : [])];
    rows.push({ key: "payment_methods", value: methods, is_public: true });
  }
  const { error } = await a.db.from("store_settings").upsert(rows, { onConflict: "key" });
  if (error) return dbError(error, "Couldn't save settings.");
  await audit(a, "settings.update", "settings", section.id);
  revalidatePath("/", "layout"); return { ok: "Saved." };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export async function saveHours(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const rows: Record<string, unknown>[] = [];
  for (let d = 0; d < 7; d++) {
    const closed = flag(fd, `closed_${d}`), o = str(fd, `open_${d}`), c = str(fd, `close_${d}`);
    if (closed) { rows.push({ day_of_week: d, is_closed: true }); continue; }
    if (!o && !c) continue;
    if (!TIME.test(o) || !TIME.test(c)) return { error: "Enter both opening and closing times for each open day." };
    rows.push({ day_of_week: d, opens_at: o, closes_at: c, is_closed: false });
  }
  const del = await a.db.from("store_hours").delete().not("day_of_week", "is", null);
  if (del.error) return dbError(del.error, "Couldn't save hours.");
  if (rows.length) { const { error } = await a.db.from("store_hours").insert(rows); if (error) return dbError(error, "Couldn't save hours."); }
  await audit(a, "hours.update", "settings", "hours"); revalidatePath("/", "layout");
  return { ok: rows.length ? "Opening hours saved." : "Saved. With no hours set, the store counts as open whenever orders are enabled." };
}

export async function addHoliday(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const date = str(fd, "date"), o = str(fd, "open"), c = str(fd, "close"), closed = flag(fd, "closed");
  if (!isDate(date)) return { error: "Choose a date." };
  if (!closed && (!TIME.test(o) || !TIME.test(c))) return { error: "Tick “Closed all day” or enter opening and closing times." };
  const { error } = await a.db.from("store_hours").upsert({ special_date: date, is_closed: closed, opens_at: closed ? null : o, closes_at: closed ? null : c, note: str(fd, "note").slice(0, 120) || null }, { onConflict: "special_date" });
  if (error) return dbError(error, "Couldn't save the special date.");
  await audit(a, "holiday.add", "settings", date); revalidatePath("/", "layout"); return { ok: "Added." };
}

export async function removeHoliday(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const date = str(fd, "date"); if (!isDate(date)) return { error: "Invalid request." };
  const { error } = await a.db.from("store_hours").delete().eq("special_date", date);
  if (error) return dbError(error, "Couldn't remove it."); revalidatePath("/", "layout"); return undefined;
}
