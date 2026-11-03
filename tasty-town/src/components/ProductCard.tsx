import Link from "next/link";
import { formatPaise } from "@/lib/format";
import type { Product } from "@/types";
import { FoodTypeMark } from "./FoodTypeMark";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = !product.is_available;
  return (
    <Link href={`/product/${product.slug}`} className="group block overflow-hidden rounded-xl border border-line bg-white">
      <div className={soldOut ? "opacity-50" : ""}>
        <ProductImage product={product} priority={priority} sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" />
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5"><FoodTypeMark type={product.food_type} /></span>
          <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{formatPaise(product.price_paise)}</span>
          {soldOut ? (
            <span className="rounded bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Sold out</span>
          ) : product.is_bestseller ? (
            <span className="rounded bg-lime px-2 py-0.5 text-[11px] font-semibold text-ink">Bestseller</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
