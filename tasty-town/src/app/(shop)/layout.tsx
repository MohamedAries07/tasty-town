import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/cart/CartProvider";
import { getSettings, str } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase";

export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 print:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        <div className="print:hidden"><Header name={str(s, "restaurant_name", "TASTY TOWN")} logoUrl={publicImageUrl("restaurant-assets", str(s, "logo_path"))} /></div>
        <main id="main" tabIndex={-1} className="outline-none">{children}</main>
        <div className="print:hidden"><Footer s={s} /></div>
        <div className="print:hidden"><BottomNav /></div>
      </div>
    </CartProvider>
  );
}
