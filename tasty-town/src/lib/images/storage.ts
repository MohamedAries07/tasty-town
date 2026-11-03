import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredObject = { path: string; size: number; createdAt: string | null };

/** Recursively lists every object in a bucket using real storage metadata. */
export async function listAll(db: SupabaseClient, bucket: string, prefix = ""): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(db, bucket, path)));
      else out.push({ path, size: Number((item.metadata as { size?: number } | null)?.size ?? 0), createdAt: item.created_at ?? null });
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

export const BUCKETS = ["product-images", "category-images", "promotional-banners", "restaurant-assets", "review-images"] as const;
