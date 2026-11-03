"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { formatPaise } from "@/lib/format";
import type { ProductDetail } from "@/types";
import { useCart } from "./CartProvider";

export function AddToCart({ product }: { product: ProductDetail }) {
  const { add } = useCart();
  const variants = product.product_variants.filter((v) => v.is_available);
  const addons = product.product_addons.filter((a) => a.is_available);
  const [variantId, setVariantId] = useState<string | null>(variants.find((v) => v.is_default)?.id ?? variants[0]?.id ?? null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  if (!product.is_available) return <button disabled className="h-12 w-full rounded-xl bg-line text-sm font-semibold text-muted">Sold out</button>;

  const unit = product.price_paise + (variants.find((v) => v.id === variantId)?.price_delta_paise ?? 0)
    + addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + a.price_paise, 0);
  const box = "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 text-sm";

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Choose an option</legend>
          {variants.map((v) => (
            <label key={v.id} className={box}><span className="flex items-center gap-2"><input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />{v.name}</span>
              <span className="text-muted">{v.price_delta_paise ? `+${formatPaise(v.price_delta_paise)}` : "Included"}</span></label>
          ))}</fieldset>
      )}
      {addons.length > 0 && (
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">Add-ons</legend>
          {addons.map((a) => (
            <label key={a.id} className={box}><span className="flex items-center gap-2"><input type="checkbox" checked={addonIds.includes(a.id)}
              onChange={(e) => setAddonIds((c) => (e.target.checked ? [...c, a.id] : c.filter((x) => x !== a.id)))} />{a.name}</span>
              <span className="text-muted">+{formatPaise(a.price_paise)}</span></label>
          ))}</fieldset>
      )}
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-semibold">Special instructions <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="notes" value={notes} maxLength={200} rows={2} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-line bg-white p-3 text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 items-center rounded-xl border border-line bg-white">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-12 items-center justify-center"><Minus className="size-4" /></button>
          <span aria-live="polite" className="w-8 text-center text-sm font-bold">{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} className="flex size-12 items-center justify-center"><Plus className="size-4" /></button>
        </div>
        <button type="button" className="h-12 flex-1 rounded-xl bg-lime text-sm font-bold text-ink"
          onClick={() => { add({ productId: product.id, slug: product.slug, name: product.name, variantId, addonIds, quantity: qty, notes: notes.trim(), seenUnitPaise: unit });
            setAdded(true); setTimeout(() => setAdded(false), 4000); }}>
          Add to cart · {formatPaise(unit * qty)}
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm">
        {added && <span className="flex items-center gap-2 font-medium"><Check className="size-4" />Added. <Link href="/cart" className="underline underline-offset-4">View cart</Link></span>}
      </p>
    </div>
  );
}
