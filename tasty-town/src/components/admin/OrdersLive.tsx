"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

/** One realtime subscription: any new order or status change refreshes the current server-rendered page. */
export function OrdersLive() {
  const router = useRouter();
  useEffect(() => {
    const db = browserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => router.refresh(), 400); };
    const channel = db.channel("orders-live").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh).subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); db.removeChannel(channel); };
  }, [router]);
  return null;
}
