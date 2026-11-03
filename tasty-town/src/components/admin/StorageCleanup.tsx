"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/images/client";

export function StorageCleanup() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [found, setFound] = useState<{ count: number; bytes: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/storage");
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Scan failed.");
    setFound(d);
    if (d.count === 0) setMsg("No orphaned files found.");
  }
  async function clean() {
    if (!found || !confirm(`Permanently delete ${found.count} unreferenced file(s) (${formatBytes(found.bytes)})?`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Removed ${d.removed} file(s).` : d.error ?? "Cleanup failed.");
    setFound(null);
    router.refresh();
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">Finds files in storage that no product, banner or category uses (older than 1 hour), such as leftovers from failed uploads.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={scan} disabled={busy} className="h-10 rounded-lg border border-line bg-white px-4 font-semibold disabled:opacity-50">{busy ? "Working…" : "Scan for orphaned files"}</button>
        {found && found.count > 0 && <button onClick={clean} disabled={busy} className="h-10 rounded-lg bg-[#c4301c] px-4 font-semibold text-white">Delete {found.count} file(s) · {formatBytes(found.bytes)}</button>}
      </div>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
