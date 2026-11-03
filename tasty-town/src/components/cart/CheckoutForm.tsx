"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { useQuote } from "./useQuote";
import { OrderSummary } from "./OrderSummary";
import { OrderTypeToggle } from "./OrderTypeToggle";
import { CouponField } from "./CouponField";
import { formatPaise } from "@/lib/format";

const CUSTOMER_KEY = "tt_customer_v1";
const SEED_KEY = "tt_order_seed";
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

export function CheckoutForm({ paymentNote }: { paymentNote: string }) {
  const router = useRouter();
  const cart = useCart();
  const [refresh, setRefresh] = useState(0);
  const { quote, error: quoteError } = useQuote(cart.lines, cart.orderType, cart.coupon, cart.ready, refresh);
  const [f, setF] = useState({ name: "", phone: "", line1: "", landmark: "", instructions: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  useEffect(() => { try { const c = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null"); if (c) setF((p) => ({ ...p, ...c })); } catch {} }, []);

  if (!cart.ready) return <div className="h-40 animate-pulse rounded-xl bg-line" />;
  if (cart.lines.length === 0) return <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm">Your cart is empty. <Link href="/menu" className="font-semibold underline">Browse the menu</Link></p>;

  const delivery = cart.orderType === "delivery";
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";
  const err = (k: string) => errors[k] && <p role="alert" className="mt-1 text-xs text-[#c4301c]">{errors[k]}</p>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const closed = quote && !quote.store.open;
  const unavailable = quote && (delivery ? !quote.store.deliveryEnabled : !quote.store.takeawayEnabled);
  const cantOrder = !quote || quote.issues.length > 0 || closed || quote.belowMinimum || !!unavailable || !!quote.couponError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || !quote || cantOrder) return;
    const local: Record<string, string> = {};
    if (f.name.trim().length < 2) local.customerName = "Enter your name.";
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/[\s\-+]/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))) local.phone = "Enter a valid 10-digit mobile number.";
    if (delivery && f.line1.trim().length < 5) local.address = "Enter your delivery address.";
    if (delivery && f.landmark.trim().length < 2) local.landmark = "Enter a landmark.";
    setErrors(local); setFormError(null);
    if (Object.keys(local).length) return;

    lock.current = true; setSubmitting(true);
    let seed = sessionStorage.getItem(SEED_KEY);
    if (!seed) { seed = crypto.randomUUID(); sessionStorage.setItem(SEED_KEY, seed); }
    const idempotencyKey = `${seed}-${hash(JSON.stringify([cart.lines.map((l) => [l.productId, l.variantId, l.addonIds, l.quantity, l.notes]), cart.orderType, quote.totals.total]))}`;
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        idempotencyKey, orderType: cart.orderType, customerName: f.name, phone: f.phone, coupon: cart.coupon || undefined,
        address: delivery ? { line1: f.line1, landmark: f.landmark } : undefined, instructions: f.instructions || undefined, expectedTotalPaise: quote.totals.total,
        lines: cart.lines.map((l) => ({ id: l.id, productId: l.productId, variantId: l.variantId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes })),
      }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: f.name, phone: f.phone, line1: f.line1, landmark: f.landmark })); } catch {}
        sessionStorage.removeItem(SEED_KEY);
        cart.clear();
        router.push(`${data.receiptUrl}&wa=1`);
        return;
      }
      if (data.fieldErrors) setErrors({ customerName: data.fieldErrors.customerName, phone: data.fieldErrors.phone, address: data.fieldErrors.address, coupon: data.fieldErrors.coupon });
      setFormError(data.error ?? "Something went wrong. Please try again.");
      if (data.code === "price_changed" || data.code === "cart_issues") setRefresh((n) => n + 1);
    } catch {
      setFormError("Network problem. Your order was not placed. Check your connection and try again.");
    } finally { lock.current = false; setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <OrderTypeToggle deliveryEnabled={quote?.store.deliveryEnabled} takeawayEnabled={quote?.store.takeawayEnabled} />
      {closed && <p role="alert" className="rounded-xl bg-ink p-4 text-sm text-white">{quote.store.message || "We're closed right now."} Ordering reopens when we do.</p>}
      {quoteError && <p role="alert" className="text-sm text-[#c4301c]">{quoteError}</p>}
      {quote?.issues.map((i) => <p key={i.lineId} role="alert" className="text-sm font-medium text-[#c4301c]">{i.message} <Link href="/cart" className="underline">Edit cart</Link></p>)}

      <div><label htmlFor="name" className="mb-1 block text-sm font-semibold">Name</label>
        <input id="name" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.customerName} className={input} />{err("customerName")}</div>
      <div><label htmlFor="phone" className="mb-1 block text-sm font-semibold">Mobile number</label>
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={f.phone} onChange={set("phone")} aria-invalid={!!errors.phone} className={input} />{err("phone")}</div>
      {delivery && <>
        <div><label htmlFor="line1" className="mb-1 block text-sm font-semibold">Delivery address</label>
          <textarea id="line1" rows={2} autoComplete="street-address" value={f.line1} onChange={set("line1")} aria-invalid={!!errors.address} className="w-full rounded-lg border border-line bg-white p-3 text-sm" />{err("address")}</div>
        <div><label htmlFor="landmark" className="mb-1 block text-sm font-semibold">Landmark</label>
          <input id="landmark" value={f.landmark} onChange={set("landmark")} aria-invalid={!!errors.landmark} className={input} />{err("landmark")}</div>
      </>}
      <div><label htmlFor="ins" className="mb-1 block text-sm font-semibold">Additional instructions <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="ins" rows={2} maxLength={300} value={f.instructions} onChange={set("instructions")} className="w-full rounded-lg border border-line bg-white p-3 text-sm" /></div>
      <CouponField error={quote?.couponError ?? errors.coupon ?? null} />

      <section aria-label="Order summary" className="space-y-3">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.id} className="flex justify-between gap-3 p-3"><span>{l.quantity} × {l.name}{l.variantName ? ` (${l.variantName})` : ""}{l.addons.length ? ` + ${l.addons.map((a) => a.name).join(", ")}` : ""}</span><span className="shrink-0 font-semibold">{formatPaise(l.lineTotalPaise)}</span></li>
          ))}
        </ul>
        {quote ? <OrderSummary q={quote} orderType={cart.orderType} /> : <div className="h-28 animate-pulse rounded-xl bg-line" />}
        <p className="text-sm text-muted">{delivery ? "Cash on delivery" : "Pay at pickup"}. {paymentNote}</p>
      </section>

      {quote?.belowMinimum && <p role="alert" className="text-sm font-medium text-[#c4301c]">Minimum order is {formatPaise(quote.minOrderPaise)}.</p>}
      {formError && <p role="alert" className="rounded-xl border border-[#c4301c] p-3 text-sm text-[#c4301c]">{formError}</p>}
      <button disabled={submitting || cantOrder} className="h-12 w-full rounded-xl bg-lime text-sm font-bold text-ink disabled:bg-line disabled:text-muted">
        {submitting ? "Placing order…" : quote ? `Place order · ${formatPaise(quote.totals.total)}` : "Place order"}
      </button>
      <p className="text-center text-xs text-muted">Next, WhatsApp opens with your order. Press Send there to share it with us.</p>
    </form>
  );
}
