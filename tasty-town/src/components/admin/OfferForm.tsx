import { ActionForm, SubmitButton } from "./ActionForm";
import { deleteOffer, saveOffer } from "@/app/admin/(panel)/offers/actions";
import { isoToIstLocal } from "@/lib/dates";
import { paiseToInput } from "@/lib/money";

type O = { id?: string; title?: string; description?: string | null; coupon_code?: string | null; discount_type?: string; discount_value?: number; min_order_paise?: number;
  max_discount_paise?: number | null; starts_at?: string | null; ends_at?: string | null; is_active?: boolean; priority?: number; usage_limit?: number | null };

export function OfferForm({ o = {}, products, categories, productIds = [], categoryIds = [] }: { o?: O; products: { id: string; name: string }[]; categories: { id: string; name: string }[]; productIds?: string[]; categoryIds?: string[] }) {
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm", label = "mb-1 block text-sm font-semibold";
  const value = o.discount_type === "fixed" ? paiseToInput(o.discount_value) : String(o.discount_value ?? "");
  return (
    <div className="max-w-xl space-y-6">
      <ActionForm action={saveOffer} className="space-y-4">
        {o.id && <input type="hidden" name="id" value={o.id} />}
        <div><label className={label} htmlFor="title">Title</label><input id="title" name="title" defaultValue={o.title} required maxLength={80} className={input} placeholder="Burger combo" /></div>
        <div><label className={label} htmlFor="description">Description</label><input id="description" name="description" defaultValue={o.description ?? ""} maxLength={300} className={input} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label} htmlFor="discount_type">Discount type</label><select id="discount_type" name="discount_type" defaultValue={o.discount_type ?? "percentage"} className={input}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></div>
          <div><label className={label} htmlFor="discount_value">Value</label><input id="discount_value" name="discount_value" defaultValue={value} required inputMode="decimal" className={input} /></div>
          <div><label className={label} htmlFor="min_order">Minimum order (₹)</label><input id="min_order" name="min_order" defaultValue={paiseToInput(o.min_order_paise)} inputMode="decimal" className={input} /></div>
          <div><label className={label} htmlFor="max_discount">Max discount (₹, % offers)</label><input id="max_discount" name="max_discount" defaultValue={paiseToInput(o.max_discount_paise)} inputMode="decimal" className={input} /></div>
          <div><label className={label} htmlFor="starts_at">Starts (India time)</label><input id="starts_at" type="datetime-local" name="starts_at" defaultValue={isoToIstLocal(o.starts_at ?? null)} className={input} /></div>
          <div><label className={label} htmlFor="ends_at">Ends (India time)</label><input id="ends_at" type="datetime-local" name="ends_at" defaultValue={isoToIstLocal(o.ends_at ?? null)} className={input} /></div>
          <div><label className={label} htmlFor="coupon_code">Coupon code <span className="font-normal text-muted">(empty = automatic)</span></label><input id="coupon_code" name="coupon_code" defaultValue={o.coupon_code ?? ""} className={input} /></div>
          <div><label className={label} htmlFor="usage_limit">Usage limit</label><input id="usage_limit" name="usage_limit" defaultValue={o.usage_limit ?? ""} inputMode="numeric" className={input} /></div>
          <div><label className={label} htmlFor="priority">Priority (higher wins)</label><input id="priority" name="priority" defaultValue={o.priority ?? 0} inputMode="numeric" className={input} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={o.is_active ?? true} />Active</label>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Apply to categories <span className="font-normal text-muted">(none selected = whole order)</span></legend>
          <div className="flex flex-wrap gap-3 text-sm">{categories.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="category_ids" value={c.id} defaultChecked={categoryIds.includes(c.id)} />{c.name}</label>)}</div></fieldset>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Apply to products</legend>
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-line bg-white p-3 text-sm sm:grid-cols-2">{products.map((p) => <label key={p.id} className="flex items-center gap-2"><input type="checkbox" name="product_ids" value={p.id} defaultChecked={productIds.includes(p.id)} />{p.name}</label>)}</div></fieldset>
        <p className="text-xs text-muted">Only one offer applies per order. Customers can’t change discount amounts; the server works them out. Banner images are added under Media.</p>
        <SubmitButton className="h-11 w-full bg-ink text-white">{o.id ? "Save changes" : "Create offer"}</SubmitButton>
      </ActionForm>
      {o.id && <ActionForm action={deleteOffer}><input type="hidden" name="id" value={o.id} />
        <SubmitButton confirm="Delete this offer? Past orders keep their receipts." className="bg-[#c4301c] text-white">Delete offer</SubmitButton></ActionForm>}
    </div>
  );
}
