"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";

export function CouponField({ error }: { error: string | null }) {
  const { coupon, setCoupon } = useCart();
  const [draft, setDraft] = useState(coupon);
  return (
    <div>
      <label htmlFor="coupon" className="mb-1 block text-sm font-semibold">Coupon code <span className="font-normal text-muted">(optional)</span></label>
      <div className="flex gap-2">
        <input id="coupon" value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} maxLength={40} className="h-11 flex-1 rounded-lg border border-line bg-white px-3 text-sm" />
        <button type="button" onClick={() => setCoupon(draft.trim())} className="h-11 rounded-lg border border-line bg-white px-4 text-sm font-semibold">Apply</button>
        {coupon && <button type="button" onClick={() => { setDraft(""); setCoupon(""); }} className="h-11 px-2 text-sm underline">Remove</button>}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-[#c4301c]">{error}</p>}
    </div>
  );
}
