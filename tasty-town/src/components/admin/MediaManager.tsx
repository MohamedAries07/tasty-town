"use client";
import { useState } from "react";
import { ImageGrid, type GridImage } from "./ImageGrid";
import { Uploader } from "./Uploader";

type Opt = { id: string; name: string };
type Props = {
  products: (Opt & { images: GridImage[] })[];
  categories: (Opt & { images: GridImage[] })[];
  banners: GridImage[];
};

export function MediaManager({ products, categories, banners, initialTab = "product", initialId }: Props & { initialTab?: "product" | "banner" | "category"; initialId?: string }) {
  const [tab, setTab] = useState<"product" | "banner" | "category">(initialTab);
  const [productId, setProductId] = useState(products.find((p) => p.id === initialId)?.id ?? products[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.id === initialId)?.id ?? categories[0]?.id ?? "");
  const [bannerTitle, setBannerTitle] = useState("");
  const tabBtn = (t: typeof tab, label: string) => (
    <button role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{label}</button>
  );
  const select = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";
  const product = products.find((p) => p.id === productId);
  const category = categories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2 overflow-x-auto">{tabBtn("product", "Product photos")}{tabBtn("banner", "Banners")}{tabBtn("category", "Category images")}</div>

      {tab === "product" && (
        <div className="space-y-4">
          <div><label htmlFor="pid" className="mb-1 block text-sm font-medium">Product</label>
            <select id="pid" className={select} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <Uploader target="product" entityId={productId} disabled={!productId} />
          {product && <ImageGrid images={product.images} reorderable />}
        </div>
      )}

      {tab === "banner" && (
        <div className="space-y-4">
          <div><label htmlFor="bt" className="mb-1 block text-sm font-medium">Banner title (optional)</label>
            <input id="bt" className={select} value={bannerTitle} maxLength={120} onChange={(e) => setBannerTitle(e.target.value)} /></div>
          <Uploader target="banner" title={bannerTitle} />
          <ImageGrid images={banners} />
        </div>
      )}

      {tab === "category" && (
        <div className="space-y-4">
          <div><label htmlFor="cid" className="mb-1 block text-sm font-medium">Category</label>
            <select id="cid" className={select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <p className="text-xs text-muted">A new upload becomes the category’s image. Delete older uploads to free space.</p>
          <Uploader target="category" entityId={categoryId} disabled={!categoryId} />
          {category && <ImageGrid images={category.images} />}
        </div>
      )}
    </div>
  );
}
