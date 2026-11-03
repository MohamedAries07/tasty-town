import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/queries";
import { MenuFilters } from "@/components/MenuFilters";
import { ProductCard } from "@/components/ProductCard";
import { Empty } from "@/components/Section";

export const metadata: Metadata = { title: "Menu" };
export const revalidate = 60;

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "" } = await searchParams;
  const [categories, products] = await Promise.all([getCategories(), getProducts({ q: q.trim(), type })]);
  const groups = categories
    .map((c) => ({ c, items: products.filter((p) => p.categories?.slug === c.slug) }))
    .filter((g) => g.items.length > 0);
  const uncategorised = products.filter((p) => !p.categories);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">Menu</h1>
      <MenuFilters categories={categories} q={q} type={type} />
      {products.length === 0 ? <Empty>No items match your search.</Empty> : (
        <>
          {groups.map(({ c, items }) => (
            <section key={c.id} aria-labelledby={`cat-${c.slug}`}>
              <h2 id={`cat-${c.slug}`} className="mb-3 text-lg font-bold">{c.name}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          ))}
          {uncategorised.length > 0 && (
            <section><h2 className="mb-3 text-lg font-bold">More</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{uncategorised.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
