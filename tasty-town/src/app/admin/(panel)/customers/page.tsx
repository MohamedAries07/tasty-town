import Link from "next/link";
import { requireAdmin, hasRole } from "@/lib/auth";
import { formatPaise } from "@/lib/format";

export const metadata = { title: "Customers" };
const PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { db, role } = await requireAdmin("staff");
  if (!hasRole(role, "manager")) return <p className="text-sm">Customer details need manager access.</p>;
  const sp = await searchParams, page = Math.max(1, Number(sp.page) || 1), q = (sp.q ?? "").trim().slice(0, 40).replace(/[%_\\,()]/g, " ").trim();
  const { data, error } = await db.rpc("customer_summary", { p_search: q || null, p_limit: PAGE, p_offset: (page - 1) * PAGE });
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load customers. Check that all migrations have been applied.</p>;
  const rows = data as { phone: string; name: string; orders: number; last_order: string; confirmed_spend: number; total_count: number }[];
  const total = rows[0]?.total_count ?? 0, fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const link = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Customers</h1>
      <p className="text-sm text-muted">Built from orders. Guests who never register still appear here by phone number.</p>
      <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Name or phone" aria-label="Search customers" className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm" /><button className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Search</button></form>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No customers found.</p> : (
        <ul className="space-y-2">{rows.map((c) => (
          <li key={c.phone}><Link href={`/admin/customers/${c.phone}`} className="block rounded-xl border border-line bg-white p-3 hover:border-ink">
            <div className="flex justify-between gap-2"><span className="font-semibold">{c.name}</span><span className="font-bold">{formatPaise(c.confirmed_spend)}</span></div>
            <p className="mt-0.5 text-xs text-muted">{c.phone} · {c.orders} order{c.orders === 1 ? "" : "s"} · last {fmt.format(new Date(c.last_order))}</p></Link></li>))}</ul>)}
      <nav className="flex items-center justify-between text-sm" aria-label="Pages">
        {page > 1 ? <Link href={link(page - 1)} className="font-semibold underline">Previous</Link> : <span />}<span className="text-muted">{total} customers</span>
        {page * PAGE < total ? <Link href={link(page + 1)} className="font-semibold underline">Next</Link> : <span />}</nav>
    </div>
  );
}
