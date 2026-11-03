import Link from "next/link";
import type { Category } from "@/types";

const TYPES = [["", "All"], ["veg", "Veg"], ["non_veg", "Non-veg"], ["egg", "Egg"]] as const;

export function MenuFilters({ categories, q, type, active }: { categories: Category[]; q: string; type: string; active?: string }) {
  const href = (cat: string | undefined, t: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("type", t);
    const qs = p.toString();
    return `${cat ? `/category/${cat}` : "/menu"}${qs ? `?${qs}` : ""}`;
  };
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`;
  return (
    <div className="space-y-3">
      <form action={active ? `/category/${active}` : "/menu"} role="search" className="flex gap-2">
        <label htmlFor="menu-q" className="sr-only">Search products</label>
        <input id="menu-q" name="q" defaultValue={q} type="search" placeholder="Search by name" className="h-11 flex-1 rounded-xl border border-line bg-white px-4 text-sm" />
        {type && <input type="hidden" name="type" value={type} />}
        <button className="rounded-xl bg-ink px-5 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categories">
        <Link href={href(undefined, type)} className={chip(!active)}>All</Link>
        {categories.map((c) => <Link key={c.id} href={href(c.slug, type)} className={chip(active === c.slug)}>{c.name}</Link>)}
      </div>
      <div className="flex gap-2 overflow-x-auto" aria-label="Food type">
        {TYPES.map(([v, label]) => <Link key={v} href={href(active, v)} className={chip(type === v)}>{label}</Link>)}
      </div>
    </div>
  );
}
