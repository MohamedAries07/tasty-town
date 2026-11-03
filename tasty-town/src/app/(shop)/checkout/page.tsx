import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getSettings, str } from "@/lib/queries";

export const metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">Checkout</h1>
      <p className="text-sm text-muted">No account needed.</p>
      <CheckoutForm paymentNote={str(s, "payment_instructions")} />
    </div>
  );
}
