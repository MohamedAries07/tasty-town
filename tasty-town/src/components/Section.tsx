import Link from "next/link";
import type { ReactNode } from "react";

export function Section({ title, href, linkLabel = "See all", children }: { title: string; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {href && <Link href={href} className="text-sm font-semibold underline underline-offset-4">{linkLabel}</Link>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-muted">{children}</p>;
}
