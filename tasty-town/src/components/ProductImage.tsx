import Image from "next/image";
import { publicImageUrl } from "@/lib/supabase";
import type { Product } from "@/types";

export function primaryImage(p: Product) {
  return [...p.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)[0] ?? null;
}

/** Fixed 4:3 frame prevents layout shift. Shows a neutral tile until a photo is uploaded. */
export function ProductImage({ product, priority = false, sizes, variant = "card" }: { product: Product; priority?: boolean; sizes: string; variant?: "card" | "detail" | "thumb" }) {
  const img = primaryImage(product);
  const src = publicImageUrl("product-images", img ? (img.variants?.[variant] ?? img.storage_path) : null);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#efefeb]">
      {src ? (
        <Image src={src} alt={product.name} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-4xl font-black text-[#d9d9d4]">
          {product.name.charAt(0)}
        </span>
      )}
    </div>
  );
}
