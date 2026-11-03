"use client";
import { useCart, type OrderType } from "./CartProvider";

export function OrderTypeToggle({ deliveryEnabled = true, takeawayEnabled = true }: { deliveryEnabled?: boolean; takeawayEnabled?: boolean }) {
  const { orderType, setOrderType } = useCart();
  const opts: { v: OrderType; label: string; on: boolean }[] = [{ v: "delivery", label: "Home delivery", on: deliveryEnabled }, { v: "takeaway", label: "Takeaway", on: takeawayEnabled }];
  return (
    <div role="radiogroup" aria-label="Order type" className="grid grid-cols-2 gap-2">
      {opts.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={orderType === o.v} disabled={!o.on} onClick={() => setOrderType(o.v)}
          className={`h-11 rounded-xl border text-sm font-semibold disabled:opacity-40 ${orderType === o.v ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
          {o.label}{!o.on && " (unavailable)"}
        </button>
      ))}
    </div>
  );
}
