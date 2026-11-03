import { formatPaise } from "./format.ts";

export type OrderSnapshot = {
  reference: string; customer_name: string; customer_phone: string; order_type: "delivery" | "takeaway";
  address: { line1?: string; landmark?: string; notes?: string } | null;
  items: { product_name: string; quantity: number; unit_price_paise: number; line_total_paise: number;
    selected_options: { variant?: string | null; addons?: { name: string; price_paise: number }[]; notes?: string } }[];
  subtotal_paise: number; discount_paise: number; delivery_fee_paise: number; total_paise: number; special_instructions: string | null;
};

/** Plain-text order message. Encode with encodeURIComponent when building the wa.me URL. */
export function buildWhatsAppMessage(restaurant: string, o: OrderSnapshot): string {
  const L: string[] = [`*${restaurant}* — New order`, `Order: ${o.reference}`, "", `Name: ${o.customer_name}`, `Phone: ${o.customer_phone}`,
    `Type: ${o.order_type === "delivery" ? "Home delivery" : "Takeaway"}`, "", "*Items*"];
  o.items.forEach((it, i) => {
    const opt = it.selected_options ?? {};
    L.push(`${i + 1}. ${it.product_name} × ${it.quantity} — ${formatPaise(it.line_total_paise)}`);
    if (opt.variant) L.push(`   Option: ${opt.variant}`);
    if (opt.addons?.length) L.push(`   Add-ons: ${opt.addons.map((a) => a.name).join(", ")}`);
    if (opt.notes) L.push(`   Note: ${opt.notes}`);
  });
  L.push("", `Subtotal: ${formatPaise(o.subtotal_paise)}`);
  if (o.discount_paise > 0) L.push(`Discount: -${formatPaise(o.discount_paise)}`);
  if (o.order_type === "delivery") L.push(`Delivery fee: ${o.delivery_fee_paise > 0 ? formatPaise(o.delivery_fee_paise) : "Free"}`);
  L.push(`*Total: ${formatPaise(o.total_paise)}*`);
  if (o.order_type === "delivery" && o.address) {
    L.push("", `Address: ${[o.address.line1, o.address.landmark && `Landmark: ${o.address.landmark}`].filter(Boolean).join(", ")}`);
  }
  if (o.special_instructions) L.push("", `Instructions: ${o.special_instructions}`);
  return L.join("\n");
}
