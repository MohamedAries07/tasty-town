"use client";
import { useEffect, useState } from "react";
import type { Quote } from "@/lib/order-quote";
import type { CartLine, OrderType } from "./CartProvider";

export type ClientQuote = Omit<Quote, "offerRule">;

/** Asks the server to price the cart. The browser never computes what the customer pays. */
export function useQuote(lines: CartLine[], orderType: OrderType, coupon: string, enabled: boolean, refreshKey = 0) {
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const payload = JSON.stringify({
    lines: lines.map((l) => ({ id: l.id, productId: l.productId, variantId: l.variantId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes })),
    orderType, coupon: coupon.trim() || undefined,
  });

  useEffect(() => {
    if (!enabled || lines.length === 0) { setQuote(null); setError(null); return; }
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: ctl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't price your cart.");
        setQuote(data); setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message || "Network problem. Check your connection.");
      } finally { if (!ctl.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, enabled, refreshKey]);

  return { quote, error, loading };
}
