import { requireAdmin, hasRole } from "@/lib/auth";
import { publicImageUrl } from "@/lib/supabase";
import { formatBytes } from "@/lib/images/client";
import { BUCKETS, listAll } from "@/lib/images/storage";
import { MediaManager } from "@/components/admin/MediaManager";
import { StorageCleanup } from "@/components/admin/StorageCleanup";
import type { GridImage } from "@/components/admin/ImageGrid";

export const metadata = { title: "Media" };

type Row = { id: string; variants: Record<string, string>; image_format: string; width: number; height: number; total_bytes: number; original_size_bytes: number | null };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const sp = await searchParams;
  const { db, role } = await requireAdmin();
  if (!hasRole(role, "manager")) return <p className="text-sm">Media management needs manager access.</p>;

  const [products, categories, images, assets] = await Promise.all([
    db.from("products").select("id,name").eq("is_archived", false).order("display_order"),
    db.from("categories").select("id,name").order("display_order"),
    db.from("product_images").select("id,product_id,is_primary,display_order,variants,image_format,width,height,total_bytes,original_size_bytes").order("display_order"),
    db.from("media_assets").select("id,bucket,entity,entity_id,variants,image_format,width,height,total_bytes,original_size_bytes"),
  ]);
  const error = products.error ?? categories.error ?? images.error ?? assets.error;
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load media. Check that all migrations have been applied.</p>;

  const pData = products.data ?? [], cData = categories.data ?? [], iData = images.data ?? [], aData = assets.data ?? [];
  const toGrid = (r: Row, kind: "product" | "asset", bucket: string, variant: string, extra: Partial<GridImage> = {}): GridImage => ({
    id: r.id, kind, src: publicImageUrl(bucket, r.variants[variant] ?? r.variants.thumb), format: r.image_format,
    width: r.width, height: r.height, bytes: r.total_bytes, original: r.original_size_bytes, ...extra,
  });

  const productData = pData.map((p) => ({
    ...p, images: iData.filter((i) => i.product_id === p.id).map((i) => toGrid(i as Row, "product", "product-images", "thumb", { primary: i.is_primary, label: p.name })),
  }));
  const categoryData = cData.map((c) => ({
    ...c, images: aData.filter((a) => a.entity === "category" && a.entity_id === c.id).map((a) => toGrid(a as Row, "asset", "category-images", "thumb")),
  }));
  const banners = aData.filter((a) => a.entity === "banner").map((a) => toGrid(a as Row, "asset", "promotional-banners", "thumb"));

  // Real storage metadata, per bucket.
  const usage = await Promise.all(BUCKETS.map(async (b) => {
    try { const o = await listAll(db, b); return { b, count: o.length, bytes: o.reduce((a, x) => a + x.size, 0), ok: true }; }
    catch { return { b, count: 0, bytes: 0, ok: false }; }
  }));
  const all = [...iData, ...aData];
  const withOriginal = all.filter((r) => r.original_size_bytes);
  const original = withOriginal.reduce((a, r) => a + (r.original_size_bytes ?? 0), 0);
  const optimized = withOriginal.reduce((a, r) => a + r.total_bytes, 0);
  const total = usage.reduce((a, u) => a + u.bytes, 0);
  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black tracking-tight">Media</h1>
      <MediaManager products={productData} categories={categoryData} banners={banners} initialTab={sp.tab === "banner" || sp.tab === "category" ? sp.tab : "product"} initialId={sp.id} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Storage</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stat("Total storage used", formatBytes(total))}
          {usage.map((u) => stat(u.b.replace("-", " "), u.ok ? `${formatBytes(u.bytes)} · ${u.count} files` : "Unavailable"))}
          {stat("Images stored", String(all.length))}
          {stat("Avg size per image (all variants)", all.length ? formatBytes(Math.round(all.reduce((a, r) => a + r.total_bytes, 0) / all.length)) : "—")}
          {stat("Total original uploads", withOriginal.length ? formatBytes(original) : "—")}
          {stat("Estimated savings", withOriginal.length ? `${formatBytes(Math.max(0, original - optimized))} (${Math.round((1 - optimized / original) * 100)}%)` : "—")}
        </div>
        <p className="text-xs text-muted">Originals are not kept. “Original” is the size of the file you uploaded, compared with all optimized sizes stored. Each photo is stored in several sizes, so small originals may show little or no saving.</p>
        <StorageCleanup />
      </section>
    </div>
  );
}
