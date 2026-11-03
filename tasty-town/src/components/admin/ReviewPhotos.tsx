"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { shrinkForReview } from "@/lib/images/client";

export function ReviewPhotos({ reviewId, photos }: { reviewId: string; photos: { path: string; url: string }[] }) {
  const router = useRouter(), ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(null);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData(); fd.set("reviewId", reviewId); fd.set("file", await shrinkForReview(f));
        const res = await fetch("/api/admin/review-images", { method: "POST", body: fd });
        if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Upload failed."); break; }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    setBusy(false); router.refresh();
  }
  async function remove(path: string) {
    if (!confirm("Delete this photo permanently?")) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/admin/review-images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, path }) });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Couldn't delete.");
    setBusy(false); router.refresh();
  }
  return (
    <section className="space-y-2"><h2 className="font-bold">Photos</h2>
      <p className="text-xs text-muted">Only attach photos the customer sent you and agreed to share.</p>
      {photos.length > 0 && <ul className="flex flex-wrap gap-2">{photos.map((p) => (
        <li key={p.path} className="relative size-24 overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.url} alt="Review photo" className="h-full w-full object-cover" />
          <button disabled={busy} onClick={() => remove(p.path)} aria-label="Delete photo" className="absolute right-1 top-1 flex size-7 items-center justify-center rounded bg-white text-[#c4301c]"><Trash2 className="size-4" /></button></li>))}</ul>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <button type="button" disabled={busy || photos.length >= 5} onClick={() => ref.current?.click()} className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50">{busy ? "Working…" : "Add photos"}</button>
      {error && <p role="alert" className="text-sm text-[#c4301c]">{error}</p>}
    </section>
  );
}
