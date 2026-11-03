import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/admin";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { db } = await requireAdmin("manager");
  const [p, cats] = await Promise.all([
    db.from("products").select("*,product_variants(*),product_addons(*)").eq("id", id).maybeSingle(),
    db.from("categories").select("id,name").order("display_order"),
  ]);
  if (!p.data) notFound();
  const { product_variants, product_addons, ...product } = p.data;
  const byOrder = (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-tight">Edit product</h1>
        <Link href={`/admin/media?tab=product&id=${id}`} className="flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold">Photos</Link></div>
      <ProductForm p={product} categories={cats.data ?? []} variants={[...product_variants].sort(byOrder)} addons={[...product_addons].sort(byOrder)} />
    </div>
  );
}
