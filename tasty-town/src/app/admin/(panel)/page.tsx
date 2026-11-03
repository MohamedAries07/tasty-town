import Link from "next/link";
import { requireAdmin, hasRole } from "@/lib/auth";
import { formatPaise, offerLabel } from "@/lib/format";
import { isDate, istRange, todayIST } from "@/lib/dates";
import { summarizeOrders, topProducts, CONFIRMED_STATUSES } from "@/lib/metrics";
import { OrdersLive } from "@/components/admin/OrdersLive";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Overview" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { db, role } = await requireAdmin("staff");
  const sp = await searchParams, today = todayIST();
  const from = sp.from && isDate(sp.from) ? sp.from : today, to = sp.to && isDate(sp.to) ? sp.to : from > today ? from : today;
  const { startISO, endISO } = istRange(from, to > from ? to : from);

  const pendingReviews = hasRole(role, "manager") ? (await db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending")).count ?? 0 : 0;
  const [orders, items, recent, products, offers] = await Promise.all([
    db.from("orders").select("status,total_paise,payment_status").gte("created_at", startISO).lt("created_at", endISO).limit(5000),
    db.from("order_items").select("product_name,quantity,line_total_paise,orders!inner(status,created_at)").in("orders.status", CONFIRMED_STATUSES).gte("orders.created_at", startISO).lt("orders.created_at", endISO).limit(10000),
    db.from("orders").select("id,reference,customer_name,total_paise,status,created_at").order("created_at", { ascending: false }).limit(8),
    db.from("products").select("id,name,is_available").eq("is_archived", false),
    db.from("offers").select("id,title,discount_type,discount_value,ends_at").eq("is_active", true),
  ]);
  if (orders.error || items.error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load the dashboard. Check that all migrations have been applied.</p>;
  const s = summarizeOrders(orders.data), top = topProducts(items.data), soldOut = (products.data ?? []).filter((p) => !p.is_available);
  const live = (offers.data ?? []).filter((o) => !o.ends_at || new Date(o.ends_at) > new Date());
  const card = (label: string, value: string, hint?: string) => <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-black">{value}</p>{hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}</div>;
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return (
    <div className="max-w-4xl space-y-6">
      <OrdersLive />
      <h1 className="text-2xl font-black tracking-tight">Overview</h1>
      <form className="flex flex-wrap items-end gap-2 text-xs text-muted">
        <label>From<input type="date" name="from" defaultValue={from} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink" /></label>
        <label>To<input type="date" name="to" defaultValue={to} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink" /></label>
        <button className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Apply</button>
        <Link href="/admin" className="flex h-10 items-center px-2 text-sm underline">Today</Link>
      </form>
      {pendingReviews > 0 && <Link href="/admin/reviews" className="block rounded-xl border border-line bg-white p-3 text-sm font-semibold">{pendingReviews} review{pendingReviews > 1 ? "s" : ""} waiting for approval →</Link>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {card("Order requests", String(s.requests), "all orders placed")}{card("Pending WhatsApp", String(s.pending), "not yet seen by restaurant")}
        {card("Confirmed", String(s.confirmed), "confirmed or further along")}{card("Completed", String(s.completed))}
        {card("Cancelled", String(s.cancelled))}
        {card("Confirmed revenue", formatPaise(s.confirmedRevenue), "excludes pending and cancelled")}
        {card("Recognised revenue", formatPaise(s.recognisedRevenue), "completed and marked paid")}
        {card("Average order", formatPaise(s.averageOrderPaise), "confirmed orders")}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-2 font-bold">Best sellers</h2>{top.length === 0 ? <p className="text-sm text-muted">No confirmed sales in this period.</p> :
          <ol className="space-y-1 text-sm">{top.map((t, i) => <li key={t.name} className="flex justify-between rounded-lg border border-line bg-white px-3 py-2"><span>{i + 1}. {t.name}</span><span className="text-muted">{t.quantity} sold · {formatPaise(t.revenue)}</span></li>)}</ol>}</section>
        <section><h2 className="mb-2 font-bold">Recent orders</h2>{(recent.data ?? []).length === 0 ? <p className="text-sm text-muted">No orders yet.</p> :
          <ul className="space-y-1 text-sm">{recent.data!.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2"><span className="min-w-0 truncate">{o.reference} · {o.customer_name}</span><span className="flex shrink-0 items-center gap-2"><span className="text-xs text-muted">{fmt.format(new Date(o.created_at))}</span><StatusBadge status={o.status} /></span></Link></li>)}</ul>}</section>
        <section><h2 className="mb-2 font-bold">Menu availability</h2><p className="text-sm">{(products.data ?? []).length - soldOut.length} available · {soldOut.length} sold out</p>
          {soldOut.length > 0 && <p className="mt-1 text-sm text-muted">{soldOut.map((p) => p.name).join(", ")}</p>}</section>
        <section><h2 className="mb-2 font-bold">Current offers</h2>{live.length === 0 ? <p className="text-sm text-muted">No active offers.</p> :
          <ul className="space-y-1 text-sm">{live.map((o) => <li key={o.id}>{o.title} · {offerLabel(o)}</li>)}</ul>}</section>
      </div>
      {!hasRole(role, "manager") && <p className="text-xs text-muted">Signed in as staff: you can view and update orders.</p>}
    </div>
  );
}
