import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/queries";
import { MenuFilters } from "@/components/MenuFilters";
import { ProductCard } from "@/components/ProductCard";
import { Empty } from "@/components/Section";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  return { title: c?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const [{ slug }, { q = "", type = "" }] = await Promise.all([params, searchParams]);
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const products = await getProducts({ categoryId: category.id, q: q.trim(), type });
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">{category.name}</h1>
      <MenuFilters categories={categories} q={q} type={type} active={slug} />
      {products.length === 0 ? <Empty>No items found in this category.</Empty> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </div>
  );
}
