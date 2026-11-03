import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/admin";
import { OfferForm } from "@/components/admin/OfferForm";

export const metadata = { title: "Edit offer" };
export default async function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) notFound();
  const { db } = await requireAdmin("manager");
  const [o, p, c] = await Promise.all([
    db.from("offers").select("*,offer_products(product_id),offer_categories(category_id)").eq("id", id).maybeSingle(),
    db.from("products").select("id,name").eq("is_archived", false).order("name"), db.from("categories").select("id,name").order("display_order")]);
  if (!o.data) notFound();
  const { offer_products, offer_categories, ...offer } = o.data;
  return <div className="space-y-4"><h1 className="text-2xl font-black tracking-tight">Edit offer</h1>
    <OfferForm o={offer} products={p.data ?? []} categories={c.data ?? []} productIds={offer_products.map((x: { product_id: string }) => x.product_id)} categoryIds={offer_categories.map((x: { category_id: string }) => x.category_id)} /></div>;
}
