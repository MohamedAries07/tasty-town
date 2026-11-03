import { requireAdmin } from "@/lib/auth";
import { ReviewAdminForm } from "@/components/admin/ReviewAdminForm";

export const metadata = { title: "Add review" };
export default async function NewReview() {
  const { db } = await requireAdmin("manager");
  const { data } = await db.from("products").select("id,name").eq("is_archived", false).order("name");
  return <div className="space-y-4"><h1 className="text-2xl font-black tracking-tight">Add review</h1><ReviewAdminForm products={data ?? []} /></div>;
}
