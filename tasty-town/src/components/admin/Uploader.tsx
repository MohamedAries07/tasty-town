"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { formatBytes, prepareForUpload } from "@/lib/images/client";

type Item = { name: string; pct: number; state: "queued" | "uploading" | "processing" | "done" | "error"; note?: string };

function send(file: File, fields: Record<string, string>, onPct: (n: number) => void, onUploaded: () => void) {
  return new Promise<{ ok: boolean; data: Record<string, unknown> }>((resolve) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/images");
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.upload.onload = onUploaded;
    xhr.onload = () => { let data = {}; try { data = JSON.parse(xhr.responseText); } catch {} resolve({ ok: xhr.status === 200, data }); };
    xhr.onerror = () => resolve({ ok: false, data: { error: "Network error. Check your connection and retry." } });
    xhr.send(fd);
  });
}

export function Uploader({ target, entityId, title, purpose, disabled }: { target: "product" | "banner" | "category" | "asset"; entityId?: string; title?: string; purpose?: string; disabled?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const patch = (i: number, p: Partial<Item>) => setItems((cur) => cur.map((x, n) => (n === i ? { ...x, ...p } : x)));

  async function run(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const start = items.length;
    setItems((cur) => [...cur, ...list.map((f) => ({ name: f.name, pct: 0, state: "queued" as const }))]);
    for (let n = 0; n < list.length; n++) {
      const i = start + n;
      patch(i, { state: "uploading" });
      const file = await prepareForUpload(list[n]);
      const fields: Record<string, string> = { target };
      if (entityId) fields.entityId = entityId;
      if (title) fields.title = title;
      if (purpose) fields.purpose = purpose;
      const res = await send(file, fields, (pct) => patch(i, { pct }), () => patch(i, { pct: 100, state: "processing" }));
      if (res.ok) {
        const d = res.data as { originalBytes: number; optimizedBytes: number };
        patch(i, { state: "done", note: `${formatBytes(d.originalBytes)} → ${formatBytes(d.optimizedBytes)} (all sizes)` });
      } else patch(i, { state: "error", note: String(res.data.error ?? "Upload failed.") });
    }
    router.refresh();
  }

  const btn = "flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={() => gallery.current?.click()} className={`${btn} bg-ink text-white`}><ImagePlus className="size-4" />Choose photos</button>
        <button type="button" disabled={disabled} onClick={() => camera.current?.click()} className={`${btn} border border-line bg-white`}><Camera className="size-4" />Take photo</button>
      </div>
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden onChange={(e) => { run(e.target.files); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { run(e.target.files); e.target.value = ""; }} />
      {items.length > 0 && (
        <ul className="space-y-2 text-sm" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg border border-line bg-white p-3">
              <div className="flex justify-between gap-2"><span className="truncate">{it.name}</span>
                <span className={it.state === "error" ? "text-[#c4301c]" : "text-muted"}>
                  {{ queued: "Waiting", uploading: `Uploading ${it.pct}%`, processing: "Optimizing…", done: "Done", error: "Failed" }[it.state]}
                </span></div>
              {(it.state === "uploading" || it.state === "processing") && (
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-lime transition-[width]" style={{ width: `${it.pct}%` }} /></div>
              )}
              {it.note && <p className={`mt-1 text-xs ${it.state === "error" ? "text-[#c4301c]" : "text-muted"}`}>{it.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
