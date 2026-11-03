"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPaise } from "@/lib/format";
import { useCart } from "./CartProvider";
import { useQuote } from "./useQuote";
import { OrderSummary } from "./OrderSummary";
import { OrderTypeToggle } from "./OrderTypeToggle";
import { CouponField } from "./CouponField";

export function CartView() {
  const cart = useCart();
  const { quote, error, loading } = useQuote(cart.lines, cart.orderType, cart.coupon, cart.ready);

  if (!cart.ready) return <div className="h-40 animate-pulse rounded-xl bg-line" aria-label="Loading cart" />;
  if (cart.lines.length === 0) return (
    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
      <p className="font-semibold">Your cart is empty</p>
      <Link href="/menu" className="mt-4 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white">Browse the menu</Link>
    </div>
  );

  const priced = new Map((quote?.lines ?? []).map((l) => [l.id, l]));
  const issueFor = new Map((quote?.issues ?? []).map((i) => [i.lineId, i.message]));
  const changed = cart.lines.filter((l) => { const p = priced.get(l.id); return p && p.unitPaise !== l.seenUnitPaise; });
  const blocked = !quote || quote.issues.length > 0 || !quote.store.open || quote.belowMinimum || (cart.orderType === "delivery" ? !quote.store.deliveryEnabled : !quote.store.takeawayEnabled);

  return (
    <div className="space-y-5">
      {quote && !quote.store.open && <p role="alert" className="rounded-xl bg-ink p-4 text-sm text-white">{quote.store.message || "We're closed right now."} You can keep browsing and fill your cart.</p>}
      {error && <p role="alert" className="rounded-xl border border-[#c4301c] p-3 text-sm text-[#c4301c]">{error}</p>}
      {changed.length > 0 && (
        <div role="alert" className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="font-semibold">Prices have changed for: {changed.map((l) => l.name).join(", ")}.</p>
          <button onClick={() => cart.acceptPrices(Object.fromEntries(changed.map((l) => [l.id, priced.get(l.id)!.unitPaise])))} className="mt-2 font-semibold underline underline-offset-4">Okay, keep these items</button>
        </div>
      )}
      <ul className="space-y-3">
        {cart.lines.map((l) => {
          const p = priced.get(l.id);
          const issue = issueFor.get(l.id);
          return (
            <li key={l.id} className="rounded-xl border border-line bg-white p-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/product/${l.slug}`} className="font-semibold">{p?.name ?? l.name}</Link>
                  {p?.variantName && <p className="text-xs text-muted">{p.variantName}</p>}
                  {p && p.addons.length > 0 && <p className="text-xs text-muted">+ {p.addons.map((a) => a.name).join(", ")}</p>}
                  {l.notes && <p className="text-xs text-muted">Note: {l.notes}</p>}
                </div>
                <p className="shrink-0 text-sm font-bold">{p ? formatPaise(p.lineTotalPaise) : loading ? "…" : ""}</p>
              </div>
              {issue && <p role="alert" className="mt-2 text-sm font-medium text-[#c4301c]">{issue}</p>}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex h-10 items-center rounded-lg border border-line">
                  <button aria-label={`Decrease ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity - 1)} className="flex size-10 items-center justify-center"><Minus className="size-4" /></button>
                  <span className="w-8 text-center text-sm font-bold" aria-live="polite">{l.quantity}</span>
                  <button aria-label={`Increase ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity + 1)} className="flex size-10 items-center justify-center"><Plus className="size-4" /></button>
                </div>
                <button aria-label={`Remove ${l.name}`} onClick={() => cart.remove(l.id)} className="flex size-10 items-center justify-center text-[#c4301c]"><Trash2 className="size-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>

      <OrderTypeToggle deliveryEnabled={quote?.store.deliveryEnabled} takeawayEnabled={quote?.store.takeawayEnabled} />
      <CouponField error={quote?.couponError ?? null} />
      {quote ? <OrderSummary q={quote} orderType={cart.orderType} /> : <div className="h-28 animate-pulse rounded-xl bg-line" />}
      {quote?.belowMinimum && <p role="alert" className="text-sm font-medium text-[#c4301c]">Minimum order is {formatPaise(quote.minOrderPaise)}. Add {formatPaise(quote.minOrderPaise - quote.totals.subtotal)} more.</p>}
      {quote?.store.prepTime && <p className="text-xs text-muted">Estimated preparation time: {quote.store.prepTime}</p>}
      {blocked ? <button disabled className="h-12 w-full rounded-xl bg-line text-sm font-semibold text-muted">Checkout</button>
        : <Link href="/checkout" className="flex h-12 w-full items-center justify-center rounded-xl bg-lime text-sm font-bold text-ink">Checkout · {formatPaise(quote!.totals.total)}</Link>}
    </div>
  );
}
