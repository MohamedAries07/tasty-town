import { formatPaise } from "@/lib/format";
import type { ClientQuote } from "./useQuote";
import type { OrderType } from "./CartProvider";

export function OrderSummary({ q, orderType }: { q: ClientQuote; orderType: OrderType }) {
  const row = "flex justify-between text-sm";
  return (
    <dl className="space-y-2 rounded-xl border border-line bg-white p-4">
      <div className={row}><dt>Subtotal</dt><dd>{formatPaise(q.totals.subtotal)}</dd></div>
      {q.totals.discount > 0 && <div className={`${row} text-[#167a35]`}><dt>Discount{q.offer ? ` · ${q.offer.title}` : ""}</dt><dd>−{formatPaise(q.totals.discount)}</dd></div>}
      {orderType === "delivery" && <div className={row}><dt>Delivery fee</dt><dd>{q.totals.deliveryFee > 0 ? formatPaise(q.totals.deliveryFee) : "Free"}</dd></div>}
      <div className="flex justify-between border-t border-line pt-2 text-base font-black"><dt>Total</dt><dd>{formatPaise(q.totals.total)}</dd></div>
    </dl>
  );
}
