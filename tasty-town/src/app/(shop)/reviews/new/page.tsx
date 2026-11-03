import type { Metadata } from "next";
import { ReviewForm } from "@/components/ReviewForm";
import { serviceClient } from "@/lib/supabase-admin";
import { publicClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Write a review", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewReview({ searchParams }: { searchParams: Promise<{ product?: string; order?: string; t?: string }> }) {
  const sp = await searchParams;
  const pub = publicClient();
  const { data: products } = pub ? await pub.from("products").select("id,name,slug").eq("is_archived", false).order("name") : { data: [] };
  const list = products ?? [];
  const productId = list.find((p) => p.slug === sp.product)?.id;

  // A receipt link lets a customer review an order that was really completed.
  let order: { reference: string; token: string; productIds: string[] } | null = null, notice: string | null = null, blocked = false;
  if (sp.order && sp.t && /^[A-Z0-9-]{6,30}$/.test(sp.order) && /^[0-9a-f]{20,80}$/.test(sp.t)) {
    try {
      const { data: o } = await serviceClient().from("orders").select("status,order_items(product_id)").eq("reference", sp.order).eq("receipt_token", sp.t).maybeSingle();
      if (!o) notice = "We couldn't find that order, so this review won't be marked as a verified order.";
      else if (o.status !== "completed") { notice = "You can review this order once it has been completed."; blocked = true; }
      else order = { reference: sp.order, token: sp.t, productIds: (o.order_items as { product_id: string | null }[]).map((i) => i.product_id).filter((x): x is string => !!x) };
    } catch { notice = "We couldn't check that order right now."; }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">Write a review</h1>
      {notice && <p role="alert" className="rounded-xl border border-line bg-white p-3 text-sm">{notice}</p>}
      {!blocked ? <ReviewForm products={list.map((p) => ({ id: p.id, name: p.name }))} productId={productId} orderRef={order?.reference} token={order?.token} verifiedProducts={order?.productIds} /> : null}
    </div>
  );
}
