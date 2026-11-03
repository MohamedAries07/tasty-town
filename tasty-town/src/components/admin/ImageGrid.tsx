"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Star, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/images/client";

export type GridImage = {
  id: string; kind: "product" | "asset"; src: string | null; primary?: boolean; format: string;
  width: number; height: number; bytes: number; original: number | null; label?: string;
};

export function ImageGrid({ images, reorderable = false }: { images: GridImage[]; reorderable?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(id: string, method: "PATCH" | "DELETE", body: object) {
    setBusy(id); setError(null);
    const res = await fetch("/api/admin/images", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
    else router.refresh();
  }

  if (images.length === 0) return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">No images yet.</p>;
  return (
    <div>
      {error && <p role="alert" className="mb-2 text-sm font-medium text-[#c4301c]">{error}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <li key={img.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="relative aspect-[4/3] bg-[#efefeb]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img.src && <img src={img.src} alt={img.label ?? ""} className="h-full w-full object-cover" loading="lazy" />}
              {img.primary && <span className="absolute left-2 top-2 rounded bg-lime px-2 py-0.5 text-[11px] font-bold">Primary</span>}
            </div>
            <div className="space-y-2 p-2 text-xs text-muted">
              <p>{img.format.toUpperCase()} · {img.width}×{img.height}<br />
                {formatBytes(img.bytes)}{img.original ? ` · original ${formatBytes(img.original)}` : ""}</p>
              <div className="flex items-center gap-1">
                {img.kind === "product" && !img.primary && (
                  <button disabled={busy === img.id} onClick={() => call(img.id, "PATCH", { id: img.id, action: "primary" })} aria-label="Make primary" className="flex size-9 items-center justify-center rounded-lg border border-line text-ink"><Star className="size-4" /></button>
                )}
                {reorderable && <>
                  <button disabled={busy === img.id} onClick={() => call(img.id, "PATCH", { id: img.id, action: "up" })} aria-label="Move earlier" className="flex size-9 items-center justify-center rounded-lg border border-line text-ink"><ArrowLeft className="size-4" /></button>
                  <button disabled={busy === img.id} onClick={() => call(img.id, "PATCH", { id: img.id, action: "down" })} aria-label="Move later" className="flex size-9 items-center justify-center rounded-lg border border-line text-ink"><ArrowRight className="size-4" /></button>
                </>}
                <button disabled={busy === img.id} aria-label="Delete image" className="ml-auto flex size-9 items-center justify-center rounded-lg border border-line text-[#c4301c]"
                  onClick={() => { if (confirm("Delete this image permanently?")) call(img.id, "DELETE", { kind: img.kind, id: img.id }); }}><Trash2 className="size-4" /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
