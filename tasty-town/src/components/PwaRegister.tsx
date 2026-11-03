"use client";
import { useEffect, useState } from "react";

/** Registers the service worker and offers a one-tap refresh when a new version is ready, so nobody stays on an old app. */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) setWaiting(w); });
      });
      const check = () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); };
      document.addEventListener("visibilitychange", check);
    }).catch((e) => console.error("[sw]", e));
  }, []);
  if (!waiting) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink p-3 text-sm text-white shadow-lg md:bottom-4 print:hidden">
      <span>A new version is ready.</span>
      <button onClick={() => waiting.postMessage("SKIP_WAITING")} className="rounded-lg bg-lime px-4 py-2 font-semibold text-ink">Update</button>
    </div>
  );
}
