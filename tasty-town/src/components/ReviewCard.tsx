import Link from "next/link";
import { Star } from "lucide-react";
import type { ReviewWithImages } from "@/types";

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-ink text-ink" : "text-line"}`} />)}
    </span>
  );
}

export function ReviewCard({ r }: { r: ReviewWithImages }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <Stars value={r.rating} />
      {r.review_title && <h3 className="mt-2 text-sm font-bold">{r.review_title}</h3>}
      {r.review_text && <p className="mt-1 text-sm text-muted">{r.review_text}</p>}
      {r.images.length > 0 && (
        <ul className="mt-3 flex gap-2">{r.images.map((src) => (
          <li key={src} className="aspect-square w-20 overflow-hidden rounded-lg bg-[#efefeb]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo from ${r.customer_name}`} loading="lazy" className="h-full w-full object-cover" /></li>))}</ul>)}
      <p className="mt-3 text-xs font-medium">{r.customer_name}
        {r.is_verified && <span className="ml-2 text-muted">Verified order</span>}
        {r.products && <> · <Link href={`/product/${r.products.slug}`} className="text-muted underline underline-offset-2">{r.products.name}</Link></>}</p>
    </article>
  );
}
