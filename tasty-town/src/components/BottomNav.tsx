"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "./cart/CartProvider";

const ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/menu", label: "Menu", Icon: UtensilsCrossed },
  { href: "/offers", label: "Offers", Icon: Tag },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
];

export function BottomNav() {
  const path = usePathname();
  const { count, ready } = useCart();
  if (path.startsWith("/admin")) return null;
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex h-16 max-w-md">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}>
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                  {href === "/cart" && ready && count > 0 && <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">{count}</span>}
                </span>
                {label}
                <span className={`h-0.5 w-5 rounded ${active ? "bg-lime" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
