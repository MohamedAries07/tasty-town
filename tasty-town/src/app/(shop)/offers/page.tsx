import type { Metadata } from "next";
import { getOffers } from "@/lib/queries";
import { formatPaise, offerLabel } from "@/lib/format";
import { Empty } from "@/components/Section";

export const metadata: Metadata = { title: "Offers" };
export const revalidate = 60;

export default async function OffersPage() {
  const offers = await getOffers();
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">Today’s offers</h1>
      {offers.length === 0 ? <Empty>No offers right now. Check back soon.</Empty> : offers.map((o) => (
        <article key={o.id} className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#c4301c]">{offerLabel(o)}</p>
          <h2 className="mt-1 text-lg font-bold">{o.title}</h2>
          {o.description && <p className="mt-1 text-sm text-muted">{o.description}</p>}
          <p className="mt-3 text-xs text-muted">
            {o.min_order_paise > 0 && <>Minimum order {formatPaise(o.min_order_paise)}. </>}
            {o.coupon_code && <>Use code <b className="text-ink">{o.coupon_code}</b> at checkout.</>}
          </p>
        </article>
      ))}
    </div>
  );
}
