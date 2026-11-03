import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { serviceClient } from "@/lib/supabase-admin";
import { getSettings, str } from "@/lib/queries";
import { formatPaise, whatsappLink } from "@/lib/format";
import { buildWhatsAppMessage, type OrderSnapshot } from "@/lib/whatsapp";
import { ReceiptActions } from "@/components/cart/ReceiptActions";

export const metadata = { title: "Order receipt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending_whatsapp: "Pending WhatsApp confirmation", received: "Received", confirmed: "Confirmed", preparing: "Preparing",
  ready: "Ready", out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ t?: string; wa?: string }> }) {
  const [{ reference }, { t, wa }] = await Promise.all([params, searchParams]);
  if (!t || !/^[0-9a-f]{20,80}$/.test(t) || !/^[A-Z0-9-]{6,30}$/.test(reference)) notFound();

  const db = serviceClient();
  const { data: o } = await db.from("orders").select("*,order_items(*)").eq("reference", reference).eq("receipt_token", t).maybeSingle();
  if (!o) notFound();

  const s = await getSettings();
  const name = str(s, "restaurant_name", "TASTY TOWN");
  const waNumber = str(s, "whatsapp_number");
  const snapshot: OrderSnapshot = { reference: o.reference, customer_name: o.customer_name, customer_phone: o.customer_phone, order_type: o.order_type, address: o.address,
    items: o.order_items, subtotal_paise: o.subtotal_paise, discount_paise: o.discount_paise, delivery_fee_paise: o.delivery_fee_paise, total_paise: o.total_paise, special_instructions: o.special_instructions };
  const message = buildWhatsAppMessage(name, snapshot);
  const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(o.created_at));
  const restaurantConfirmed = !["pending_whatsapp", "received", "cancelled"].includes(o.status);
  const steps = [
    { done: true, label: "Order saved" },
    { done: !!o.whatsapp_handoff_at, label: "WhatsApp opened" },
    { done: !!o.customer_confirmed_sent_at, label: "You told us you sent it" },
    { done: restaurantConfirmed, label: "Restaurant confirmed" },
  ];
  const row = "flex justify-between gap-4 text-sm";

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <article className="space-y-4 rounded-xl border border-line bg-white p-5 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-lg bg-ink text-sm font-black text-lime">TT</span>
            <p className="text-lg font-black">{name}</p></div>
            <p className="mt-2 text-xs text-muted">{str(s, "address")}<br />{str(s, "contact_phone")}</p></div>
          <div className="text-right text-xs text-muted"><p className="font-bold text-ink">{o.reference}</p><p>{when}</p></div>
        </header>

        <p className="rounded-lg bg-paper px-3 py-2 text-sm font-semibold">{STATUS[o.status] ?? o.status}</p>

        <section className="space-y-1 text-sm"><p className="font-semibold">{o.customer_name}</p><p>{o.customer_phone}</p>
          <p>{o.order_type === "delivery" ? "Home delivery" : "Takeaway"}</p>
          {o.order_type === "delivery" && o.address && <p className="text-muted">{o.address.line1}{o.address.landmark ? ` · ${o.address.landmark}` : ""}</p>}
          {o.special_instructions && <p className="text-muted">Instructions: {o.special_instructions}</p>}</section>

        <ul className="divide-y divide-line border-y border-line">
          {o.order_items.map((it: OrderSnapshot["items"][number] & { id: string }) => (
            <li key={it.id} className="space-y-0.5 py-3">
              <div className={row}><span className="font-medium">{it.quantity} × {it.product_name}</span><span>{formatPaise(it.line_total_paise)}</span></div>
              <p className="text-xs text-muted">{formatPaise(it.unit_price_paise)} each</p>
              {it.selected_options?.variant && <p className="text-xs text-muted">{it.selected_options.variant}</p>}
              {!!it.selected_options?.addons?.length && <p className="text-xs text-muted">+ {it.selected_options.addons.map((a) => a.name).join(", ")}</p>}
              {it.selected_options?.notes && <p className="text-xs text-muted">Note: {it.selected_options.notes}</p>}
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5">
          <div className={row}><dt>Subtotal</dt><dd>{formatPaise(o.subtotal_paise)}</dd></div>
          {o.discount_paise > 0 && <div className={row}><dt>Discount{o.offer_snapshot?.title ? ` · ${o.offer_snapshot.title}` : ""}</dt><dd>−{formatPaise(o.discount_paise)}</dd></div>}
          {o.order_type === "delivery" && <div className={row}><dt>Delivery fee</dt><dd>{o.delivery_fee_paise > 0 ? formatPaise(o.delivery_fee_paise) : "Free"}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base font-black"><dt>Total</dt><dd>{formatPaise(o.total_paise)}</dd></div>
        </dl>
        <p className="text-xs text-muted">Payment: {o.payment_method === "cash_on_delivery" ? "Cash on delivery" : "Pay at pickup"} · {o.payment_status === "paid" ? "Paid" : "Not yet paid"}.
          {str(s, "payment_instructions") && ` ${str(s, "payment_instructions")}`}</p>
      </article>

      <ol className="space-y-2 print:hidden" aria-label="Order progress">
        {steps.map((st) => (
          <li key={st.label} className={`flex items-center gap-2 text-sm ${st.done ? "font-medium" : "text-muted"}`}>
            {st.done ? <Check className="size-4 text-[#167a35]" /> : <Circle className="size-4" />}{st.label}</li>
        ))}
      </ol>

      {o.status === "completed" && <Link href={`/reviews/new?order=${o.reference}&t=${t}`} className="block rounded-xl border border-line bg-white p-4 text-center text-sm font-semibold print:hidden">How was your order? Write a review</Link>}

      <ReceiptActions reference={o.reference} token={t} waUrl={whatsappLink(waNumber, message)} message={message} phone={str(s, "contact_phone").replace(/\s/g, "")}
        autoOpen={wa === "1" && !o.whatsapp_handoff_at && o.status === "pending_whatsapp"} handoffAt={o.whatsapp_handoff_at} sentAt={o.customer_confirmed_sent_at} />
    </div>
  );
}
