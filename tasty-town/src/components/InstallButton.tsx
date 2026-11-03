"use client";
import { useEffect, useState } from "react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent));
    const on = (e: Event) => { e.preventDefault(); setPrompt(e as Prompt); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", () => setPrompt(null));
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (!prompt && !ios) return null;
  return (
    <div className="text-sm">
      <button onClick={async () => { if (prompt) { await prompt.prompt(); setPrompt(null); } else setOpen((o) => !o); }} className="rounded-lg border border-white/30 px-4 py-2">Install app</button>
      {open && <p className="mt-2 text-white/70">Tap the Share button in Safari, then “Add to Home Screen”.</p>}
    </div>
  );
}
