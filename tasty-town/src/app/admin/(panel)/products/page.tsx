import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin, hasRole } from "@/lib/auth";
import { formatPaise } from "@/lib/format";
import { ArchiveButton, DuplicateButton, MoveButtons, ToggleChip } from "@/components/admin/ProductRowActions";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; archived?: string }> }) {
  const { db, role } = await requireAdmin();
  if (!hasRole(role, "manager")) return <p className="text-sm">Product management needs manager access.</p>;
  const { q = "", cat = "", archived } = await searchParams;
  const showArchived = archived === "1";
  const [cats, prods] = await Promise.all([
    db.from("categories").select("id,name").order("display_order"),
    (() => { let b = db.from("products").select("id,name,price_paise,food_type,is_available,is_featured,is_bestseller,is_archived,category_id,categories(name)").eq("is_archived", showArchived).order("display_order").order("name");
      if (q) b = b.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`); if (cat) b = b.eq("category_id", cat); return b; })(),
  ]);
  if (prods.error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load products.</p>;
  const field = "h-10 rounded-lg border border-line bg-white px-3 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-black tracking-tight">Products</h1>
        <Link href="/admin/products/new" className="flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" />New</Link></div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search" aria-label="Search products" className={`${field} flex-1`} />
        <select name="cat" defaultValue={cat} aria-label="Category" className={field}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="archived" defaultValue={archived ?? "0"} aria-label="Show" className={field}><option value="0">Active</option><option value="1">Archived</option></select>
        <button className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold">Filter</button>
      </form>
      {prods.data.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No products found.</p> : (
        <ul className="space-y-2">
          {prods.data.map((p) => (
            <li key={p.id} className="space-y-3 rounded-xl border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><Link href={`/admin/products/${p.id}`} className="font-semibold underline-offset-4 hover:underline">{p.name}</Link>
                  <p className="text-xs text-muted">{(p.categories as unknown as { name: string } | null)?.name ?? "No category"} · {p.food_type.replace("_", "-")}</p></div>
                <p className="font-bold">{formatPaise(p.price_paise)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleChip id={p.id} field="is_available" on={p.is_available} onLabel="Available" offLabel="Sold out" />
                <ToggleChip id={p.id} field="is_featured" on={p.is_featured} onLabel="Featured" offLabel="Not featured" />
                <ToggleChip id={p.id} field="is_bestseller" on={p.is_bestseller} onLabel="Bestseller" offLabel="Not bestseller" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/products/${p.id}`} className="flex min-h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold">Edit</Link>
                <Link href={`/admin/media?tab=product&id=${p.id}`} className="flex min-h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold">Photos</Link>
                <DuplicateButton id={p.id} /><ArchiveButton id={p.id} archived={p.is_archived} />
                {!showArchived && <div className="ml-auto"><MoveButtons id={p.id} /></div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
