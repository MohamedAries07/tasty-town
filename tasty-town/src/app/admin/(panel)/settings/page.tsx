import { requireAdmin } from "@/lib/auth";
import { publicImageUrl } from "@/lib/supabase";
import { SETTINGS } from "@/lib/settings-schema";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ImageGrid } from "@/components/admin/ImageGrid";
import { Uploader } from "@/components/admin/Uploader";
import { addHoliday, removeHoliday, saveHours } from "./actions";

export const metadata = { title: "Settings" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PURPOSES = [["hero_image", "Homepage hero image"], ["logo", "Logo"], ["og_image", "Social sharing image"]] as const;

export default async function SettingsPage() {
  const { db } = await requireAdmin("super_admin");
  const [s, h, assets] = await Promise.all([db.from("store_settings").select("key,value"), db.from("store_hours").select("*"), db.from("media_assets").select("id,variants,image_format,width,height,total_bytes,original_size_bytes").eq("entity", "asset")]);
  if (s.error || h.error || assets.error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load settings.</p>;
  const values = Object.fromEntries(s.data.map((r) => [r.key, r.value]));
  const weekly = new Map(h.data.filter((r) => r.day_of_week !== null).map((r) => [r.day_of_week as number, r]));
  const special = h.data.filter((r) => r.special_date).sort((a, b) => a.special_date.localeCompare(b.special_date));
  const input = "h-10 rounded-lg border border-line bg-white px-3 text-sm";
  const t = (v: string | null) => (v ? v.slice(0, 5) : "");

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Settings</h1>
      {SETTINGS.map((sec) => <SettingsForm key={sec.id} section={sec} values={values} />)}

      <section className="space-y-4 rounded-xl border border-line bg-white p-4">
        <h2 className="text-lg font-bold">Images</h2>
        {PURPOSES.map(([purpose, label]) => (
          <div key={purpose} className="space-y-2"><p className="text-sm font-semibold">{label}</p>
            <Uploader target="asset" purpose={purpose} />
            <ImageGrid images={assets.data.filter((a) => (a.variants as Record<string, string>).banner?.startsWith(`${purpose}/`)).map((a) => ({ id: a.id, kind: "asset" as const,
              src: publicImageUrl("restaurant-assets", (a.variants as Record<string, string>).thumb), format: a.image_format, width: a.width, height: a.height, bytes: a.total_bytes, original: a.original_size_bytes }))} /></div>))}
        <p className="text-xs text-muted">The newest upload is used. Delete older ones to free space. A favicon isn’t configurable yet.</p>
      </section>

      <ActionForm action={saveHours} className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h2 className="text-lg font-bold">Weekly opening hours (India time)</h2>
        <p className="text-xs text-muted">Tick “Closed” for weekly holidays. If you set hours for any day, days left blank count as closed. For after-midnight closing, set a closing time earlier than the opening time.</p>
        {DAYS.map((d, i) => { const r = weekly.get(i); return (
          <div key={d} className="grid grid-cols-[88px_1fr_1fr_auto] items-center gap-2 text-sm"><span>{d}</span>
            <input type="time" name={`open_${i}`} defaultValue={t(r?.opens_at ?? null)} aria-label={`${d} opens`} className={input} />
            <input type="time" name={`close_${i}`} defaultValue={t(r?.closes_at ?? null)} aria-label={`${d} closes`} className={input} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name={`closed_${i}`} defaultChecked={r?.is_closed} />Closed</label></div>); })}
        <SubmitButton>Save hours</SubmitButton>
      </ActionForm>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4"><h2 className="text-lg font-bold">Special dates & holidays</h2>
        {special.map((r) => (
          <ActionForm key={r.id} action={removeHoliday} className="flex items-center justify-between gap-2 text-sm"><input type="hidden" name="date" value={r.special_date} />
            <span>{r.special_date} · {r.is_closed ? "Closed" : `${t(r.opens_at)}–${t(r.closes_at)}`}{r.note ? ` · ${r.note}` : ""}</span>
            <SubmitButton confirm="Remove this date?" className="border border-line bg-white !min-h-8 !px-3 !text-xs text-[#c4301c]">Remove</SubmitButton></ActionForm>))}
        <ActionForm action={addHoliday} className="grid grid-cols-2 gap-2 text-sm">
          <input type="date" name="date" aria-label="Date" required className={input} /><label className="flex items-center gap-2"><input type="checkbox" name="closed" defaultChecked />Closed all day</label>
          <input type="time" name="open" aria-label="Opens" className={input} /><input type="time" name="close" aria-label="Closes" className={input} />
          <input name="note" placeholder="Message (e.g. Closed for Diwali)" maxLength={120} className={`${input} col-span-2`} /><SubmitButton>Add date</SubmitButton></ActionForm>
      </section>
    </div>
  );
}
