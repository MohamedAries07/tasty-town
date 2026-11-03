"use client";
import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { shrinkForReview } from "@/lib/images/client";

type Props = { products: { id: string; name: string }[]; productId?: string; orderRef?: string; token?: string; verifiedProducts?: string[] };

export function ReviewForm({ products, productId, orderRef, token, verifiedProducts }: Props) {
  const [rating, setRating] = useState(0);
  const [product, setProduct] = useState(productId ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ verified: boolean } | null>(null);
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm", label = "mb-1 block text-sm font-semibold";
  const choices = verifiedProducts ? products.filter((p) => verifiedProducts.includes(p.id)) : products;

  if (done) return (
    <div role="status" className="space-y-3 rounded-xl border border-line bg-white p-6 text-center">
      <p className="text-lg font-black">Thank you!</p>
      <p className="text-sm text-muted">Your review will appear after a quick check by the restaurant.{done.verified && " It will show as a verified order."}</p>
      <Link href="/reviews" className="inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white">See reviews</Link>
    </div>
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    if (rating < 1) return setError("Choose a star rating.");
    setBusy(true); setError(null);
    try {
      f.set("rating", String(rating));
      if (product) f.set("productId", product); else f.delete("productId");
      if (orderRef && token) { f.set("orderRef", orderRef); f.set("token", token); }
      f.delete("images");
      for (const file of files) f.append("images", await shrinkForReview(file));
      const res = await fetch("/api/reviews", { method: "POST", body: f });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone({ verified: !!data.verified }); else setError(data.error ?? "Something went wrong. Please try again.");
    } catch (err) { setError(err instanceof Error ? err.message : "Network problem. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset><legend className={label}>Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="flex size-11 items-center justify-center rounded-lg">
            <Star className={`size-7 ${n <= rating ? "fill-ink text-ink" : "text-line"}`} /></button>))}</div></fieldset>
      <div><label className={label} htmlFor="rv-product">What are you reviewing?</label>
        <select id="rv-product" value={product} onChange={(e) => setProduct(e.target.value)} className={input} disabled={!!verifiedProducts && choices.length === 0}>
          <option value="">TASTY TOWN overall</option>{choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><label className={label} htmlFor="rv-name">Name shown publicly</label><input id="rv-name" name="customerName" required maxLength={60} autoComplete="given-name" className={input} placeholder="First name is fine" /></div>
      <div><label className={label} htmlFor="rv-title">Title <span className="font-normal text-muted">(optional)</span></label><input id="rv-title" name="title" maxLength={80} className={input} /></div>
      <div><label className={label} htmlFor="rv-text">Your review</label><textarea id="rv-text" name="text" required rows={4} minLength={10} maxLength={800} className="w-full rounded-lg border border-line bg-white p-3 text-sm" /></div>
      <div><label className={label} htmlFor="rv-photos">Photos <span className="font-normal text-muted">(optional, up to 3)</span></label>
        <input id="rv-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} className="block w-full text-sm" />
        {files.length > 0 && <p className="mt-1 text-xs text-muted">{files.length} photo{files.length > 1 ? "s" : ""} selected. Photos are checked before they appear publicly.</p>}</div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {orderRef && <p className="text-xs text-muted">This review is linked to order {orderRef}.</p>}
      {error && <p role="alert" className="text-sm font-medium text-[#c4301c]">{error}</p>}
      <button disabled={busy} className="h-12 w-full rounded-xl bg-lime text-sm font-bold text-ink disabled:opacity-60">{busy ? "Sending…" : "Send review"}</button>
      <p className="text-center text-xs text-muted">We never show your phone number or address.</p>
    </form>
  );
}
