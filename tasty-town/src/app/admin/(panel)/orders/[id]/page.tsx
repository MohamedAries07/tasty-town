import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/admin";
import { formatPaise, whatsappLink } from "@/lib/format";
import { nextStatuses, STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { OrdersLive } from "@/components/admin/OrdersLive";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { saveOrderDetails } from "../actions";

export const metadata = { title: "Order" };

type Item = { id: string; product_name: string; quantity: number; unit_price_paise: number; line_total_paise: number; selected_options: { variant?: string; addons?: { name: string }[]; notes?: string } };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) notFound();
  const { db, role } = await requireAdmin("staff");
  const [o, h] = await Promise.all([
    db.from("orders").select("*,order_items(*)").eq("id", id).maybeSingle(),
    db.from("order_status_history").select("id,from_status,to_status,note,created_at").eq("order_id", id).order("created_at"),
  ]);
  if (!o.data) notFound();
  const order = o.data, fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const next = nextStatuses(order.status as OrderStatus, order.order_type, role);
  const hi = `Hi ${order.customer_name}, this is TASTY TOWN about your order ${order.reference}.`;
  const input = "w-full rounded-lg border border-line bg-white p-3 text-sm";
  return (
    <div className="max-w-xl space-y-5">
      <OrdersLive />
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-muted"><ChevronLeft className="size-4" />Orders</Link>
      <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-black tracking-tight">{order.reference}</h1><p className="text-xs text-muted">{fmt.format(new Date(order.created_at))}</p></div><StatusBadge status={order.status} /></div>

      <section className="space-y-1 rounded-xl border border-line bg-white p-4 text-sm">
        <p className="font-semibold">{order.customer_name}</p><p>{order.customer_phone}</p><p>{order.order_type === "delivery" ? "Home delivery" : "Takeaway"}</p>
        {order.address && <p className="text-muted">{order.address.line1}{order.address.landmark ? ` · ${order.address.landmark}` : ""}</p>}
        {order.special_instructions && <p className="text-muted">Instructions: {order.special_instructions}</p>}
        <a href={whatsappLink(`91${order.customer_phone}`, hi)} className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-lime px-4 font-semibold text-ink"><MessageCircle className="size-4" />WhatsApp customer</a>
        <p className="pt-2 text-xs text-muted">WhatsApp opened by customer: {order.whatsapp_handoff_at ? fmt.format(new Date(order.whatsapp_handoff_at)) : "no"} · Customer says sent: {order.customer_confirmed_sent_at ? fmt.format(new Date(order.customer_confirmed_sent_at)) : "no"}. Check your WhatsApp inbox to confirm you actually received it.</p>
      </section>

      <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(order.order_items as Item[]).map((it) => (
          <li key={it.id} className="p-3"><div className="flex justify-between gap-3"><span className="font-medium">{it.quantity} × {it.product_name}</span><span>{formatPaise(it.line_total_paise)}</span></div>
            {it.selected_options?.variant && <p className="text-xs text-muted">{it.selected_options.variant}</p>}
            {!!it.selected_options?.addons?.length && <p className="text-xs text-muted">+ {it.selected_options.addons.map((a) => a.name).join(", ")}</p>}
            {it.selected_options?.notes && <p className="text-xs text-muted">Note: {it.selected_options.notes}</p>}</li>))}
        <li className="space-y-1 p-3"><div className="flex justify-between"><span>Subtotal</span><span>{formatPaise(order.subtotal_paise)}</span></div>
          {order.discount_paise > 0 && <div className="flex justify-between"><span>Discount{order.offer_snapshot?.title ? ` · ${order.offer_snapshot.title}` : ""}</span><span>−{formatPaise(order.discount_paise)}</span></div>}
          {order.order_type === "delivery" && <div className="flex justify-between"><span>Delivery fee</span><span>{formatPaise(order.delivery_fee_paise)}</span></div>}
          <div className="flex justify-between font-black"><span>Total</span><span>{formatPaise(order.total_paise)}</span></div></li>
      </ul>

      {next.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-line bg-white p-4"><h2 className="font-bold">Update status</h2>
          <OrderStatusForm orderId={order.id} options={next.map((st) => ({ status: st, label: st === "cancelled" ? "Cancel / reject" : `Mark ${STATUS_LABEL[st].toLowerCase()}`, danger: st === "cancelled" }))} /></section>
      ) : <p className="text-sm text-muted">This order is {STATUS_LABEL[order.status as OrderStatus].toLowerCase()}. No further changes.</p>}

      <ActionForm action={saveOrderDetails} className="space-y-3 rounded-xl border border-line bg-white p-4"><h2 className="font-bold">Payment and notes</h2>
        <input type="hidden" name="id" value={order.id} />
        <div><label htmlFor="payment_status" className="mb-1 block text-sm font-semibold">Payment ({order.payment_method === "cash_on_delivery" ? "cash on delivery" : "pay at pickup"})</label>
          <select id="payment_status" name="payment_status" defaultValue={order.payment_status} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm"><option value="unpaid">Not yet paid</option><option value="paid">Paid (cash collected)</option><option value="refunded">Refunded</option></select></div>
        <div><label htmlFor="internal_notes" className="mb-1 block text-sm font-semibold">Internal notes (customers never see these)</label><textarea id="internal_notes" name="internal_notes" rows={3} maxLength={1000} defaultValue={order.internal_notes ?? ""} className={input} /></div>
        <SubmitButton>Save</SubmitButton></ActionForm>

      <section><h2 className="mb-2 font-bold">History</h2><ol className="space-y-1 text-sm">
        {(h.data ?? []).map((x) => <li key={x.id} className="text-muted"><span className="text-ink">{STATUS_LABEL[x.to_status as OrderStatus]}</span> · {fmt.format(new Date(x.created_at))}{x.note ? ` · ${x.note}` : ""}</li>)}</ol></section>
    </div>
  );
}
