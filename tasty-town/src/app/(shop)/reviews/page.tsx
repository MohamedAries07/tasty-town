import type { Metadata } from "next";
import Link from "next/link";
import { getRatings, getReviews } from "@/lib/queries";
import { averageRating, breakdown } from "@/lib/reviews";
import { withSignedImages } from "@/lib/review-media";
import { ReviewCard, Stars } from "@/components/ReviewCard";
import { Empty } from "@/components/Section";

export const metadata: Metadata = { title: "Reviews" };
export const revalidate = 60;

export default async function ReviewsPage() {
  const [reviews, ratings] = await Promise.all([getReviews({ limit: 50 }), getRatings()]);
  const list = await withSignedImages(reviews);
  const { average, count } = averageRating(ratings), bd = breakdown(ratings);
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <div className="flex items-start justify-between gap-3"><h1 className="text-3xl font-black tracking-tight">Customer reviews</h1>
        <Link href="/reviews/new" className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Write a review</Link></div>
      {average !== null && (
        <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
          <div><p className="text-4xl font-black">{average.toFixed(1)}</p><Stars value={average} /><p className="mt-1 text-xs text-muted">{count} review{count === 1 ? "" : "s"}</p></div>
          <ul className="flex-1 space-y-1 text-xs">{([5, 4, 3, 2, 1] as const).map((n) => (
            <li key={n} className="flex items-center gap-2"><span className="w-3">{n}</span><span className="h-1.5 flex-1 overflow-hidden rounded bg-line"><span className="block h-full bg-ink" style={{ width: `${count ? (bd[n] / count) * 100 : 0}%` }} /></span><span className="w-6 text-right text-muted">{bd[n]}</span></li>))}</ul>
        </div>)}
      {list.length === 0 ? <Empty>No reviews yet. Be the first to share your experience.</Empty> : <div className="grid gap-3 md:grid-cols-2">{list.map((r) => <ReviewCard key={r.id} r={r} />)}</div>}
    </div>
  );
}
