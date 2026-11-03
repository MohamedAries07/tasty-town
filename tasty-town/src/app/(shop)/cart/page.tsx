import { CartView } from "@/components/cart/CartView";

export const metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">Your cart</h1>
      <CartView />
    </div>
  );
}
