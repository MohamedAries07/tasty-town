"use client";
import { ActionForm } from "./ActionForm";
import { setOrderStatus } from "@/app/admin/(panel)/orders/actions";

export function OrderStatusForm({ orderId, options }: { orderId: string; options: { status: string; label: string; danger?: boolean }[] }) {
  return (
    <ActionForm action={setOrderStatus} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <div><label htmlFor="note" className="sr-only">Note</label>
        <input id="note" name="note" maxLength={300} placeholder="Note (optional, saved in history)" className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm" /></div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.status} name="status" value={o.status} onClick={(e) => { if (o.danger && !window.confirm("Cancel this order? The customer is not notified automatically.")) e.preventDefault(); }}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${o.danger ? "border border-line bg-white text-[#c4301c]" : "bg-ink text-white"}`}>{o.label}</button>))}
      </div>
    </ActionForm>
  );
}
