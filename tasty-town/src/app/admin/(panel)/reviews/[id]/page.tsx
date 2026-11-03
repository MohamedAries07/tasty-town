import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/admin";
import { ReviewAdminForm } from "@/components/admin/ReviewAdminForm";
import { ReviewPhotos } from "@/components/admin/ReviewPhotos";

export const metadata = { title: "Edit review" };
export default async function EditReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) notFound();
  const { db } = await requireAdmin("manager");
  const [r, p] = await Promise.all([db.from("reviews").select("*").eq("id", id).maybeSingle(), db.from("products").select("id,name").eq("is_archived", false).order("name")]);
  if (!r.data) notFound();
  const signed = r.data.image_paths.length ? (await db.storage.from("review-images").createSignedUrls(r.data.image_paths, 3600)).data ?? [] : [];
  const photos = signed.flatMap((s) => (s.signedUrl && s.path ? [{ path: s.path, url: s.signedUrl }] : []));
  return (
    <div className="max-w-xl space-y-5"><Link href="/admin/reviews" className="text-sm font-medium text-muted">← Reviews</Link>
      <h1 className="text-2xl font-black tracking-tight">Edit review</h1>
      <ReviewAdminForm r={r.data} products={p.data ?? []} /><ReviewPhotos reviewId={id} photos={photos} /></div>
  );
}
