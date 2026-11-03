import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getProductBySlug, getRatings, getReviews } from "@/lib/queries";
import { averageRating } from "@/lib/reviews";
import { withSignedImages } from "@/lib/review-media";
import { ReviewCard, Stars } from "@/components/ReviewCard";
import { formatPaise } from "@/lib/format";
import { FoodTypeMark } from "@/components/FoodTypeMark";
import { AddToCart } from "@/components/cart/AddToCart";
import { ProductImage } from "@/components/ProductImage";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  return { title: p?.name ?? "Product", description: p?.description ?? undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [rv, ratings] = await Promise.all([getReviews({ productId: product.id, limit: 10 }), getRatings(product.id)]);
  const reviews = await withSignedImages(rv), { average, count } = averageRating(ratings);
  const label = { veg: "Vegetarian", non_veg: "Non-vegetarian", egg: "Contains egg" }[product.food_type];
  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted"><ChevronLeft className="size-4" />Menu</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-line">
          <ProductImage product={product} variant="detail" priority sizes="(min-width:768px) 50vw, 100vw" />
        </div>
        <div className="space-y-4">
          {product.categories && <Link href={`/category/${product.categories.slug}`} className="text-xs font-bold uppercase tracking-wide text-muted">{product.categories.name}</Link>}
          <h1 className="text-3xl font-black leading-tight tracking-tight">{product.name}</h1>
          <p className="flex items-center gap-2 text-sm"><FoodTypeMark type={product.food_type} />{label}</p>
          <p className="text-2xl font-black">{formatPaise(product.price_paise)}</p>
          {product.description && <p className="text-sm leading-relaxed text-muted">{product.description}</p>}
          <AddToCart product={product} />
        </div>
      </div>
      <section className="mt-10 space-y-3" aria-labelledby="reviews-h">
        <div className="flex items-center justify-between gap-3"><h2 id="reviews-h" className="text-xl font-black tracking-tight">Reviews</h2>
          <Link href={`/reviews/new?product=${product.slug}`} className="text-sm font-semibold underline underline-offset-4">Write a review</Link></div>
        {average !== null && <p className="flex items-center gap-2 text-sm"><Stars value={average} /><span>{average.toFixed(1)} from {count} review{count === 1 ? "" : "s"}</span></p>}
        {reviews.length === 0 ? <p className="text-sm text-muted">No reviews for this item yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{reviews.map((r) => <ReviewCard key={r.id} r={r} />)}</div>}
      </section>
    </div>
  );
}
