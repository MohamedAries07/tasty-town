import { requireAdmin } from "@/lib/auth";
import { OfferForm } from "@/components/admin/OfferForm";

export const metadata = { title: "New offer" };
export default async function NewOffer() {
  const { db } = await requireAdmin("manager");
  const [p, c] = await Promise.all([db.from("products").select("id,name").eq("is_archived", false).order("name"), db.from("categories").select("id,name").order("display_order")]);
  return <div className="space-y-4"><h1 className="text-2xl font-black tracking-tight">New offer</h1><OfferForm products={p.data ?? []} categories={c.data ?? []} /></div>;
}
