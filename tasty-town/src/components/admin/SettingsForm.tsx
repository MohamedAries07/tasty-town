import { ActionForm, SubmitButton } from "./ActionForm";
import { saveSettings } from "@/app/admin/(panel)/settings/actions";
import type { Section } from "@/lib/settings-schema";
import { paiseToInput } from "@/lib/money";

export function SettingsForm({ section, values }: { section: Section; values: Record<string, unknown> }) {
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm", label = "mb-1 block text-sm font-semibold";
  const methods = Array.isArray(values.payment_methods) ? (values.payment_methods as string[]) : [];
  const initial = (k: string) => {
    if (k === "pay_cod") return methods.includes("cash_on_delivery"); if (k === "pay_pickup") return methods.includes("pay_at_pickup");
    return values[k];
  };
  return (
    <ActionForm action={saveSettings} className="space-y-4 rounded-xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold">{section.title}</h2><input type="hidden" name="section" value={section.id} />
      {section.fields.map((f) => {
        const v = initial(f.key);
        return (
          <div key={f.key}>
            {f.type === "bool" ? <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={f.key} defaultChecked={f.key.startsWith("pay_") ? Boolean(v) : v !== false} />{f.label}</label> : <>
              <label className={label} htmlFor={f.key}>{f.label}</label>
              {f.type === "textarea" ? <textarea id={f.key} name={f.key} rows={3} defaultValue={String(v ?? "")} className="w-full rounded-lg border border-line bg-white p-3 text-sm" />
                : f.type === "select" ? <select id={f.key} name={f.key} defaultValue={String(v ?? f.options![0][0])} className={input}>{f.options!.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>
                : f.type === "color" ? <div className="flex gap-2"><input id={f.key} name={f.key} defaultValue={String(v ?? "")} placeholder="#B8F52A" className={input} />{typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) && <span aria-hidden className="size-11 shrink-0 rounded-lg border border-line" style={{ background: v }} />}</div>
                : <input id={f.key} name={f.key} defaultValue={f.type === "rupees" ? paiseToInput(v as number | null) : f.type === "whatsapp" ? String(v ?? "").replace(/^91/, "") : String(v ?? "")} inputMode={f.type === "rupees" ? "decimal" : undefined} className={input} />}
            </>}
            {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
          </div>
        );
      })}
      <SubmitButton>Save {section.title.toLowerCase()}</SubmitButton>
    </ActionForm>
  );
}
