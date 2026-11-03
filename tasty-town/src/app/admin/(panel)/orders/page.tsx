import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPaise } from "@/lib/format";
import { istRange, isDate } from "@/lib/dates";
import { STATUSES, STATUS_LABEL } from "@/lib/orders";
import { OrdersLive } from "@/components/admin/OrdersLive";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Orders" };
const PAGE = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { db } = await requireAdmin("staff");
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[^A-Za-z0-9 +-]/g, "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  let query = db.from("orders").select("id,reference,customer_name,customer_phone,order_type,total_paise,status,payment_status,created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`reference.ilike.%${q}%,customer_phone.ilike.%${q.replace(/\D/g, "") || "x"}%`);
  if (sp.status && (STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.type === "delivery" || sp.type === "takeaway") query = query.eq("order_type", sp.type);
  if (sp.from && isDate(sp.from)) query = query.gte("created_at", istRange(sp.from, sp.from).startISO);
  if (sp.to && isDate(sp.to)) query = query.lt("created_at", istRange(sp.to, sp.to).endISO);
  const { data, count, error } = await query;
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load orders.</p>;
  const field = "h-10 rounded-lg border border-line bg-white px-3 text-sm";
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const link = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); u.set("page", String(p)); return `/admin/orders?${u}`; };

  return (
    <div className="max-w-3xl space-y-4">
      <OrdersLive />
      <h1 className="text-2xl font-black tracking-tight">Orders</h1>
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input name="q" defaultValue={sp.q} placeholder="Order no. or phone" aria-label="Search" className={`${field} col-span-2 sm:col-span-3`} />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={field}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select name="type" defaultValue={sp.type ?? ""} aria-label="Order type" className={field}><option value="">Delivery + takeaway</option><option value="delivery">Delivery</option><option value="takeaway">Takeaway</option></select>
        <span /><label className="text-xs text-muted">From<input type="date" name="from" defaultValue={sp.from} className={`${field} mt-1 w-full`} /></label>
        <label className="text-xs text-muted">To<input type="date" name="to" defaultValue={sp.to} className={`${field} mt-1 w-full`} /></label>
        <button className="h-10 self-end rounded-lg bg-ink px-4 text-sm font-semibold text-white">Filter</button>
      </form>
      {data.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No orders match.</p> : (
        <ul className="space-y-2">{data.map((o) => (
          <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="block rounded-xl border border-line bg-white p-3 hover:border-ink">
            <div className="flex items-center justify-between gap-2"><span className="font-bold">{o.reference}</span><StatusBadge status={o.status} /></div>
            <p className="mt-1 text-sm">{o.customer_name} · {o.customer_phone}</p>
            <p className="mt-1 flex justify-between text-xs text-muted"><span>{fmt.format(new Date(o.created_at))} · {o.order_type === "delivery" ? "Delivery" : "Takeaway"}</span><span className="font-semibold text-ink">{formatPaise(o.total_paise)}</span></p>
          </Link></li>))}</ul>)}
      <nav className="flex items-center justify-between text-sm" aria-label="Pages">
        {page > 1 ? <Link href={link(page - 1)} className="font-semibold underline">Newer</Link> : <span />}
        <span className="text-muted">{count ?? 0} orders</span>
        {page * PAGE < (count ?? 0) ? <Link href={link(page + 1)} className="font-semibold underline">Older</Link> : <span />}
      </nav>
    </div>
  );
}
