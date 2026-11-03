import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { CartLink } from "./cart/CartLink";

export function Header({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          {logoUrl ? <Image src={logoUrl} alt={name} width={128} height={32} className="h-8 w-auto object-contain" priority />
            : <><span className="flex size-8 items-center justify-center rounded-lg bg-ink text-sm text-lime">TT</span><span className="text-base">{name}</span></>}
        </Link>
        <nav aria-label="Site" className="ml-6 hidden gap-6 text-sm font-medium md:flex">
          <Link href="/menu">Menu</Link><Link href="/offers">Offers</Link>
          <Link href="/reviews">Reviews</Link><Link href="/about">About</Link>
        </nav>
        <form action="/menu" role="search" className="ml-auto flex items-center">
          <label htmlFor="header-search" className="sr-only">Search the menu</label>
          <input id="header-search" name="q" type="search" placeholder="Search menu"
            className="h-9 w-32 rounded-l-lg border border-r-0 border-line bg-white px-3 text-sm sm:w-56" />
          <button type="submit" aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-r-lg bg-ink text-white">
            <Search className="size-4" />
          </button>
        </form>
        <CartLink />
      </div>
    </header>
  );
}
