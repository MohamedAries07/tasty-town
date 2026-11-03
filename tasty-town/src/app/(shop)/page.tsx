import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getBanners, getCategories, getOffers, getProducts, getReviews, getSettings, str } from "@/lib/queries";
import { offerLabel } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { withSignedImages } from "@/lib/review-media";
import { ReviewCard } from "@/components/ReviewCard";
import { Empty, Section } from "@/components/Section";

export default async function Home() {
  const [s, banners, offers, categories, best, preview, reviews] = await Promise.all([
    getSettings(), getBanners(), getOffers(), getCategories(),
    getProducts({ bestseller: true, limit: 8 }), getProducts({ limit: 8 }), getReviews({ limit: 6 }),
  ]);
  const signedReviews = await withSignedImages(reviews);
  const heroSrc = publicImageUrl("restaurant-assets", str(s, "hero_image_path"));
  const address = str(s, "address");
  const maps = str(s, "maps_url");

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        {heroSrc && <Image src={heroSrc} alt="" fill priority sizes="100vw" className="object-cover opacity-50" />}
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h1 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            {str(s, "hero_heading", "GOOD FOOD. GOOD MOOD.")}
          </h1>
          <p className="mt-4 max-w-md text-base text-white/80">{str(s, "hero_subtext", "Freshly prepared favourites for every craving.")}</p>
          <p className="mt-2 text-sm font-semibold text-lime">{str(s, "tagline")}</p>
          <div className="mt-8 flex gap-3">
            <Link href="/menu" className="rounded-xl bg-lime px-6 py-3 text-sm font-bold text-ink">Order now</Link>
            <Link href="/menu" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold">Explore menu</Link>
          </div>
        </div>
      </section>

      {banners.length > 0 && (
        <Section title="Highlights">
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {banners.map((b) => {
              const src = publicImageUrl("promotional-banners", b.image_path);
              const body = (
                <div className="relative h-40 w-72 shrink-0 snap-start overflow-hidden rounded-xl bg-ink text-white sm:w-96">
                  {src && <Image src={src} alt="" fill sizes="384px" className="object-cover opacity-60" />}
                  <div className="relative flex h-full flex-col justify-end p-4">
                    <p className="text-lg font-black">{b.title}</p>
                    {b.subtitle && <p className="text-sm text-white/80">{b.subtitle}</p>}
                  </div>
                </div>
              );
              return b.link_url ? <Link key={b.id} href={b.link_url}>{body}</Link> : <div key={b.id}>{body}</div>;
            })}
          </div>
        </Section>
      )}

      {offers.length > 0 && (
        <Section title="Today’s offers" href="/offers">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 3).map((o) => (
              <div key={o.id} className="rounded-xl border border-line bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#c4301c]">{offerLabel(o)}</p>
                <p className="mt-1 font-bold">{o.title}</p>
                {o.description && <p className="mt-1 text-sm text-muted">{o.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Popular categories" href="/menu" linkLabel="Full menu">
        {categories.length === 0 ? <Empty>Categories will appear here.</Empty> : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">{c.name}</Link>
            ))}
          </div>
        )}
      </Section>

      {best.length > 0 && (
        <Section title="Best sellers" href="/menu">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{best.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}</div>
        </Section>
      )}

      <Section title="From the menu" href="/menu">
        {preview.length === 0 ? <Empty>The menu is being updated. Please check back soon.</Empty> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{preview.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </Section>

      {reviews.length > 0 && (
        <Section title="What customers say" href="/reviews">
          <div className="grid gap-3 md:grid-cols-3">{signedReviews.slice(0, 3).map((r) => <ReviewCard key={r.id} r={r} />)}</div>
        </Section>
      )}

      <Section title="Find us">
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{address}</p>
          {maps && <a href={maps} className="mt-3 inline-block font-semibold underline underline-offset-4">Open in Maps</a>}
        </div>
      </Section>
    </>
  );
}
