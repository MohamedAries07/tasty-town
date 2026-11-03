import { requireAdmin, hasRole } from "@/lib/auth";
import { formatPaise } from "@/lib/format";
import { istRange } from "@/lib/dates";
import { averageOrder, cancellationRate, daysBetween, fillDays, fillHours, hourLabel, type Report } from "@/lib/report";
import { resolveRange } from "@/lib/range";
import { BarChart } from "@/components/admin/BarChart";
import { RangeControls } from "@/components/admin/RangeControls";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string }> }) {
  const { db, role } = await requireAdmin("staff");
  if (!hasRole(role, "manager")) return <p className="text-sm">Analytics need manager access.</p>;
  const { from, to, preset, error } = resolveRange(await searchParams);
  const { startISO, endISO } = istRange(from, to);
  const { data, error: err } = await db.rpc("analytics_report", { p_from: startISO, p_to: endISO });
  if (err || !data) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load analytics. Check that all migrations have been applied.</p>;
  const r = data as Report, s = r.summary, days = fillDays(from, to, r.daily), hours = fillHours(r.hourly), n = daysBetween(from, to), rate = cancellationRate(s);
  const label = n === 1 ? "Daily report" : n >= 28 && n <= 31 && from.slice(8) === "01" ? "Monthly report" : `${n}-day report`;
  const short = (d: string) => (n <= 31 ? d.slice(8) : d.slice(5));
  const card = (l: string, v: string, hint?: string) => <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-xl font-black">{v}</p>{hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}</div>;
  const q = `from=${from}&to=${to}`;
  const dl = "flex min-h-10 items-center rounded-lg border border-line bg-white px-3 text-sm font-semibold";

  return (
    <div className="max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-black tracking-tight">Analytics</h1><p className="text-sm text-muted">{label} · {from === to ? from : `${from} to ${to}`} · India time</p></div>
      <RangeControls basePath="/admin/analytics" from={from} to={to} preset={preset} error={error} />
      <div className="flex flex-wrap gap-2"><a className={dl} href={`/api/admin/reports?${q}&format=pdf`}>Download PDF</a>
        <a className={dl} href={`/api/admin/reports?${q}&format=csv&kind=summary`}>Summary CSV</a><a className={dl} href={`/api/admin/reports?${q}&format=csv&kind=daily`}>Daily CSV</a>
        <a className={dl} href={`/api/admin/reports?${q}&format=csv&kind=products`}>Products CSV</a><a className={dl} href={`/api/admin/reports?${q}&format=csv&kind=orders`}>Orders CSV</a></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {card("Order requests", String(s.requests), "all orders placed")}{card("Confirmed orders", String(s.confirmed), "confirmed through completed")}
        {card("Completed", String(s.completed))}{card("Cancelled", String(s.cancelled), rate === null ? undefined : `${rate}% of requests`)}
        {card("Confirmed revenue", formatPaise(s.confirmed_revenue), "pending and cancelled excluded")}{card("Recognised revenue", formatPaise(s.recognised_revenue), "completed and marked paid")}
        {card("Average order", formatPaise(averageOrder(s)), "confirmed orders")}{card("Pending WhatsApp", String(s.pending), "not counted as revenue")}
      </div>
      {s.requests === 0 && <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">No orders in this period.</p>}

      {n > 1 && <>
        <BarChart title="Confirmed revenue per day" primaryName="Confirmed revenue" format={formatPaise} bars={days.map((d) => ({ label: short(d.d), value: d.confirmed_revenue }))} />
        <BarChart title="Orders per day" primaryName="Confirmed" secondaryName="Requests" format={(v) => String(v)} bars={days.map((d) => ({ label: short(d.d), value: d.confirmed, secondary: d.requests }))} />
      </>}
      <BarChart title="Order requests by hour" primaryName="Confirmed" secondaryName="Requests" format={(v) => String(v)} bars={hours.map((h) => ({ label: hourLabel(h.h), value: h.confirmed, secondary: h.requests }))} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-2 font-bold">Delivery versus takeaway</h2>
          {r.by_type.length === 0 ? <p className="text-sm text-muted">No data.</p> : <ul className="space-y-1 text-sm">{r.by_type.map((t) => (
            <li key={t.order_type} className="flex justify-between rounded-lg border border-line bg-white px-3 py-2"><span>{t.order_type === "delivery" ? "Home delivery" : "Takeaway"}</span><span className="text-muted">{t.requests} requests · {t.confirmed} confirmed · {formatPaise(t.confirmed_revenue)}</span></li>))}</ul>}</section>
        <section><h2 className="mb-2 font-bold">Category performance</h2>
          {r.categories.length === 0 ? <p className="text-sm text-muted">No confirmed sales.</p> : <ul className="space-y-1 text-sm">{r.categories.map((c) => (
            <li key={c.name} className="flex justify-between rounded-lg border border-line bg-white px-3 py-2"><span>{c.name}</span><span className="text-muted">{c.quantity} sold · {formatPaise(c.revenue)}</span></li>))}</ul>}</section>
        <section className="lg:col-span-2"><h2 className="mb-2 font-bold">Top products</h2>
          {r.top_products.length === 0 ? <p className="text-sm text-muted">No confirmed sales.</p> : <ol className="space-y-1 text-sm">{r.top_products.map((p, i) => (
            <li key={p.name} className="flex justify-between rounded-lg border border-line bg-white px-3 py-2"><span>{i + 1}. {p.name}</span><span className="text-muted">{p.quantity} sold · {formatPaise(p.revenue)}</span></li>))}</ol>}</section>
      </div>
      <p className="text-xs text-muted">Confirmed means the restaurant confirmed the order (confirmed, preparing, ready, out for delivery or completed). Recognised revenue only counts completed orders marked as paid.</p>
    </div>
  );
}
