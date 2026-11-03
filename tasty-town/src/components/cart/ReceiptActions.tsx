"use client";
import { useEffect, useState } from "react";
import { Copy, MessageCircle, Phone, Printer, Share2 } from "lucide-react";

type Props = { reference: string; token: string; waUrl: string; message: string; phone: string; autoOpen: boolean; handoffAt: string | null; sentAt: string | null };

async function record(reference: string, token: string, event: "handoff" | "sent") {
  try { await fetch(`/api/orders/${reference}/whatsapp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, event }), keepalive: true }); } catch { /* best effort */ }
}

export function ReceiptActions({ reference, token, waUrl, message, phone, autoOpen, handoffAt, sentAt }: Props) {
  const [handoff, setHandoff] = useState(!!handoffAt);
  const [sent, setSent] = useState(!!sentAt);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!autoOpen) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("wa");
    window.history.replaceState(null, "", url.toString()); // reloads won't re-open WhatsApp
    const t = setTimeout(() => { record(reference, token, "handoff"); setHandoff(true); window.location.href = waUrl; }, 700);
    return () => clearTimeout(t);
  }, [autoOpen, reference, token, waUrl]);

  const shareUrl = () => { const u = new URL(window.location.href); u.searchParams.delete("wa"); return u.toString(); };
  const btn = "flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold";

  return (
    <div className="space-y-3 print:hidden">
      {autoOpen && !handoff && <p role="status" className="text-sm text-muted">Opening WhatsApp… If nothing happens, tap the green button.</p>}
      <a href={waUrl} onClick={() => { record(reference, token, "handoff"); setHandoff(true); }} className={`${btn} bg-lime text-ink`}><MessageCircle className="size-4" />Send order on WhatsApp</a>
      <p className="text-xs text-muted">Your order is saved, but the restaurant only sees it once you press Send in WhatsApp.</p>
      {handoff && !sent && (
        <button onClick={() => { record(reference, token, "sent"); setSent(true); }} className={`${btn} w-full border border-line bg-white`}>I’ve sent it on WhatsApp</button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => window.print()} className={`${btn} border border-line bg-white`}><Printer className="size-4" />Print / Save PDF</button>
        <button onClick={async () => {
          try { if (navigator.share) await navigator.share({ title: `Receipt ${reference}`, url: shareUrl() }); else { await navigator.clipboard.writeText(shareUrl()); setNote("Receipt link copied."); } }
          catch { /* cancelled */ }
        }} className={`${btn} border border-line bg-white`}><Share2 className="size-4" />Share</button>
      </div>
      <details className="rounded-xl border border-line bg-white p-3 text-sm">
        <summary className="cursor-pointer font-semibold">WhatsApp not opening?</summary>
        <div className="mt-3 space-y-2">
          <button onClick={async () => { try { await navigator.clipboard.writeText(message); setNote("Order message copied. Paste it in WhatsApp."); } catch { setNote("Couldn't copy. Select the text below instead."); } }}
            className={`${btn} w-full border border-line`}><Copy className="size-4" />Copy order message</button>
          <a href={`tel:${phone}`} className={`${btn} border border-line`}><Phone className="size-4" />Call the restaurant</a>
          <textarea readOnly value={message} rows={6} className="w-full rounded-lg border border-line p-2 text-xs" aria-label="Order message" />
        </div>
      </details>
      {note && <p role="status" className="text-sm">{note}</p>}
    </div>
  );
}
