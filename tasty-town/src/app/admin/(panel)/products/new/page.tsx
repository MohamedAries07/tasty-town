import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };
export default async function NewProduct() {
  const { db } = await requireAdmin("manager");
  const { data } = await db.from("categories").select("id,name").order("display_order");
  return <div className="space-y-4"><h1 className="text-2xl font-black tracking-tight">New product</h1><ProductForm categories={data ?? []} /></div>;
}
