import Link from "next/link";
import { PRESETS } from "@/lib/range";

export function RangeControls({ basePath, from, to, preset, error }: { basePath: string; from: string; to: string; preset: string | null; error: string | null }) {
  const chip = (on: boolean) => `flex h-10 items-center rounded-full border px-4 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`;
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">{PRESETS.map(([k, l]) => <Link key={k} href={`${basePath}?preset=${k}`} className={chip(preset === k)}>{l}</Link>)}</div>
      <form className="flex flex-wrap items-end gap-2 text-xs text-muted">
        <label>From<input type="date" name="from" defaultValue={from} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink" /></label>
        <label>To<input type="date" name="to" defaultValue={to} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink" /></label>
        <button className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink">Custom range</button>
      </form>
      {error && <p role="alert" className="text-sm font-medium text-[#c4301c]">{error}</p>}
    </div>
  );
}
