import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { requireAdmin, hasRole } from "@/lib/auth";
import { formatPaise, whatsappLink } from "@/lib/format";
import { CONFIRMED_STATUSES } from "@/lib/metrics";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params; if (!/^\d{10}$/.test(phone)) notFound();
  const { db, role } = await requireAdmin("staff");
  if (!hasRole(role, "manager")) return <p className="text-sm">Customer details need manager access.</p>;
  const { data, error } = await db.from("orders").select("id,reference,customer_name,order_type,status,total_paise,created_at").eq("customer_phone", phone).order("created_at", { ascending: false }).limit(200);
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load this customer.</p>;
  if (!data.length) notFound();
  const spend = data.filter((o) => CONFIRMED_STATUSES.includes(o.status)).reduce((a, o) => a + o.total_paise, 0), fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/admin/customers" className="text-sm font-medium text-muted">← Customers</Link>
      <div><h1 className="text-2xl font-black tracking-tight">{data[0].customer_name}</h1><p className="text-sm text-muted">{phone}</p></div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">Orders</p><p className="font-black">{data.length}</p></div>
        <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">Confirmed spend</p><p className="font-black">{formatPaise(spend)}</p></div>
        <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">Last order</p><p className="font-black">{new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(data[0].created_at))}</p></div>
      </div>
      <a href={whatsappLink(`91${phone}`, `Hi ${data[0].customer_name}, this is TASTY TOWN.`)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-semibold text-ink"><MessageCircle className="size-4" />WhatsApp</a>
      <ul className="space-y-2">{data.map((o) => (
        <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="block rounded-xl border border-line bg-white p-3 hover:border-ink">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold">{o.reference}</span><StatusBadge status={o.status} /></div>
          <p className="mt-1 flex justify-between text-xs text-muted"><span>{fmt.format(new Date(o.created_at))} · {o.order_type === "delivery" ? "Delivery" : "Takeaway"}</span><span className="font-semibold text-ink">{formatPaise(o.total_paise)}</span></p></Link></li>))}</ul>
    </div>
  );
}
