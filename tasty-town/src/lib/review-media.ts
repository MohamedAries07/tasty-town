import "server-only";
import { serviceClient } from "./supabase-admin";
import type { Review, ReviewWithImages } from "@/types";

/** Customer photos are private; published reviews get short-lived signed URLs. */
export async function withSignedImages(reviews: Review[]): Promise<ReviewWithImages[]> {
  const paths = [...new Set(reviews.flatMap((r) => r.image_paths ?? []))];
  const map = new Map<string, string>();
  if (paths.length) {
    try {
      const { data } = await serviceClient().storage.from("review-images").createSignedUrls(paths, 3600);
      data?.forEach((d) => { if (d.path && d.signedUrl) map.set(d.path, d.signedUrl); });
    } catch (e) { console.error("[review-images]", e); }
  }
  return reviews.map((r) => ({ ...r, images: (r.image_paths ?? []).map((p) => map.get(p)).filter((x): x is string => !!x) }));
}
