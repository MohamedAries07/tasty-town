import { ActionForm, SubmitButton } from "./ActionForm";
import { RowsEditor } from "./RowsEditor";
import { saveProduct, deleteProduct } from "@/app/admin/(panel)/products/actions";
import { paiseToInput } from "@/lib/money";

type P = { id?: string; name?: string; slug?: string; description?: string | null; price_paise?: number; food_type?: string; category_id?: string | null; is_available?: boolean; is_featured?: boolean; is_bestseller?: boolean };
type Child = { id: string; name: string; price_delta_paise?: number; price_paise?: number };

export function ProductForm({ p = {}, categories, variants = [], addons = [] }: { p?: P; categories: { id: string; name: string }[]; variants?: Child[]; addons?: Child[] }) {
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";
  const label = "mb-1 block text-sm font-semibold";
  return (
    <div className="max-w-xl space-y-6">
      <ActionForm action={saveProduct} className="space-y-4">
        {p.id && <input type="hidden" name="id" value={p.id} />}
        <div><label className={label} htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} required maxLength={80} className={input} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label} htmlFor="price">Price (₹)</label><input id="price" name="price" defaultValue={paiseToInput(p.price_paise)} required inputMode="decimal" className={input} /></div>
          <div><label className={label} htmlFor="food_type">Food type</label>
            <select id="food_type" name="food_type" defaultValue={p.food_type ?? "veg"} className={input}><option value="veg">Vegetarian</option><option value="non_veg">Non-vegetarian</option><option value="egg">Contains egg</option></select></div>
        </div>
        <div><label className={label} htmlFor="category_id">Category</label>
          <select id="category_id" name="category_id" defaultValue={p.category_id ?? ""} className={input}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className={label} htmlFor="description">Description <span className="font-normal text-muted">(only what is true)</span></label>
          <textarea id="description" name="description" defaultValue={p.description ?? ""} rows={3} maxLength={600} className="w-full rounded-lg border border-line bg-white p-3 text-sm" /></div>
        <div><label className={label} htmlFor="slug">Web address <span className="font-normal text-muted">(auto from name if empty)</span></label><input id="slug" name="slug" defaultValue={p.slug} className={input} /></div>
        <div className="flex flex-wrap gap-4 text-sm">
          {([["is_available", "Available", p.is_available ?? true], ["is_featured", "Featured", p.is_featured ?? false], ["is_bestseller", "Bestseller", p.is_bestseller ?? false]] as const).map(([k, l, v]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={v} />{l}</label>))}
        </div>
        <RowsEditor prefix="variant" label="Options (size, type…) — leave empty if none" priceLabel="Extra ₹" initial={variants.map((v) => ({ id: v.id, name: v.name, price: paiseToInput(v.price_delta_paise ?? 0) || "0" }))} />
        <RowsEditor prefix="addon" label="Add-ons — leave empty if none" priceLabel="Price ₹" initial={addons.map((v) => ({ id: v.id, name: v.name, price: paiseToInput(v.price_paise ?? 0) || "0" }))} />
        <SubmitButton className="h-11 w-full bg-ink text-white">{p.id ? "Save changes" : "Create product"}</SubmitButton>
      </ActionForm>
      {p.id && (
        <ActionForm action={deleteProduct} className="space-y-2 rounded-xl border border-line p-4">
          <input type="hidden" name="id" value={p.id} />
          <p className="text-sm text-muted">Deleting removes the product and its photos permanently. Past orders keep their receipts. Archive instead if you may want it back.</p>
          <SubmitButton confirm="Permanently delete this product and its photos?" className="bg-[#c4301c] text-white">Delete product</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
