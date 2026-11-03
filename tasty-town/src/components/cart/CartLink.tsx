"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" aria-label={`Cart${ready && count ? `, ${count} items` : ""}`} className="relative ml-2 flex size-10 items-center justify-center rounded-lg">
      <ShoppingBag className="size-5" />
      {ready && count > 0 && <span className="absolute right-0 top-0 flex min-w-5 items-center justify-center rounded-full bg-lime px-1 text-[11px] font-bold text-ink">{count}</span>}
    </Link>
  );
}
