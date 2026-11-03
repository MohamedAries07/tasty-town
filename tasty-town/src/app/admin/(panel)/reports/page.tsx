import { requireAdmin, hasRole } from "@/lib/auth";
import { resolveRange } from "@/lib/range";
import { RangeControls } from "@/components/admin/RangeControls";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string }> }) {
  const { role } = await requireAdmin("staff");
  if (!hasRole(role, "manager")) return <p className="text-sm">Reports need manager access.</p>;
  const { from, to, preset, error } = resolveRange(await searchParams), q = `from=${from}&to=${to}`;
  const row = "flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 text-sm";
  const btn = "flex min-h-10 items-center rounded-lg bg-ink px-4 font-semibold text-white";
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-black tracking-tight">Reports</h1>
      <RangeControls basePath="/admin/reports" from={from} to={to} preset={preset} error={error} />
      <p className="text-sm text-muted">Period: {from === to ? from : `${from} to ${to}`} (India time)</p>
      <div className={row}><div><p className="font-semibold">Full report (PDF)</p><p className="text-xs text-muted">Summary, revenue, charts, top products, categories</p></div><a className={btn} href={`/api/admin/reports?${q}&format=pdf`}>PDF</a></div>
      {([["summary", "Summary"], ["daily", "Day by day"], ["products", "Products and categories"], ["orders", "Every order (includes customer names and phones)"]] as const).map(([k, l]) => (
        <div key={k} className={row}><p className="font-semibold">{l} (CSV)</p><a className={btn} href={`/api/admin/reports?${q}&format=csv&kind=${k}`}>CSV</a></div>))}
      <p className="text-xs text-muted">Exports contain business data. Keep downloaded files private.</p>
    </div>
  );
}
