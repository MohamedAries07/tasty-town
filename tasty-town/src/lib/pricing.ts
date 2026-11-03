import { formatPaise } from "./format.ts";

export type VariantRow = { id: string; name: string; price_delta_paise: number; is_available: boolean; is_default: boolean };
export type AddonRow = { id: string; name: string; price_paise: number; is_available: boolean };
export type CatalogProduct = {
  id: string; name: string; slug: string; price_paise: number; is_available: boolean; is_archived: boolean;
  category_id: string | null; category_name: string | null; variants: VariantRow[]; addons: AddonRow[];
};
export type LineInput = { id: string; productId: string; variantId?: string | null; addonIds?: string[]; quantity: number; notes?: string };
export type PricedLine = {
  id: string; productId: string; name: string; slug: string; categoryId: string | null; categoryName: string | null;
  variantId: string | null; variantName: string | null; addons: { id: string; name: string; price_paise: number }[];
  quantity: number; unitPaise: number; lineTotalPaise: number; notes: string;
};
export type LineIssue = { lineId: string; code: "not_found" | "unavailable" | "variant_required" | "bad_variant" | "bad_addon" | "bad_quantity"; message: string };

export const MAX_LINE_QTY = 20;
export const MAX_LINES = 30;

/** Prices every cart line from the catalogue. Client-supplied prices are never read. */
export function priceLines(inputs: LineInput[], catalog: Map<string, CatalogProduct>): { lines: PricedLine[]; issues: LineIssue[] } {
  const lines: PricedLine[] = [];
  const issues: LineIssue[] = [];
  for (const l of inputs) {
    const bad = (code: LineIssue["code"], message: string) => issues.push({ lineId: l.id, code, message });
    const p = catalog.get(l.productId);
    if (!p || p.is_archived) { bad("not_found", "An item in your cart is no longer on the menu."); continue; }
    if (!p.is_available) { bad("unavailable", `${p.name} is sold out.`); continue; }
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_LINE_QTY) { bad("bad_quantity", `Quantity for ${p.name} must be between 1 and ${MAX_LINE_QTY}.`); continue; }

    const offered = p.variants.filter((v) => v.is_available);
    let variant: VariantRow | null = null;
    if (l.variantId) {
      variant = offered.find((v) => v.id === l.variantId) ?? null;
      if (!variant) { bad("bad_variant", `The selected option for ${p.name} is no longer available.`); continue; }
    } else if (offered.length > 0) { bad("variant_required", `Choose an option for ${p.name}.`); continue; }

    const addons: PricedLine["addons"] = [];
    let addonError = false;
    for (const id of new Set(l.addonIds ?? [])) {
      const a = p.addons.find((x) => x.id === id && x.is_available);
      if (!a) { addonError = true; break; }
      addons.push({ id: a.id, name: a.name, price_paise: a.price_paise });
    }
    if (addonError) { bad("bad_addon", `An add-on for ${p.name} is no longer available.`); continue; }

    const unitPaise = p.price_paise + (variant?.price_delta_paise ?? 0) + addons.reduce((a, x) => a + x.price_paise, 0);
    lines.push({
      id: l.id, productId: p.id, name: p.name, slug: p.slug, categoryId: p.category_id, categoryName: p.category_name,
      variantId: variant?.id ?? null, variantName: variant?.name ?? null, addons,
      quantity: l.quantity, unitPaise, lineTotalPaise: unitPaise * l.quantity, notes: (l.notes ?? "").trim().slice(0, 200),
    });
  }
  return { lines, issues };
}

// ---- Offers ----------------------------------------------------------------
export type OfferRule = {
  id: string; title: string; coupon_code: string | null; discount_type: "fixed" | "percentage"; discount_value: number;
  min_order_paise: number; max_discount_paise: number | null; starts_at: string | null; ends_at: string | null;
  is_active: boolean; priority: number; usage_limit: number | null; usage_count: number; product_ids: string[]; category_ids: string[];
};
export type OfferResult = { offer: OfferRule | null; discountPaise: number; error?: string };

export function evaluateOffer(o: OfferRule, lines: PricedLine[], subtotal: number, now: Date): { discount: number; error?: string } {
  const none = (error: string) => ({ discount: 0, error });
  if (!o.is_active) return none("This offer isn't active.");
  if (o.starts_at && new Date(o.starts_at) > now) return none("This offer hasn't started yet.");
  if (o.ends_at && new Date(o.ends_at) <= now) return none("This offer has expired.");
  if (o.usage_limit !== null && o.usage_count >= o.usage_limit) return none("This offer has been fully redeemed.");
  if (subtotal < o.min_order_paise) return none(`Add ${formatPaise(o.min_order_paise - subtotal)} more to use this offer.`);

  const scoped = o.product_ids.length > 0 || o.category_ids.length > 0;
  const base = scoped
    ? lines.filter((l) => o.product_ids.includes(l.productId) || (l.categoryId !== null && o.category_ids.includes(l.categoryId))).reduce((a, l) => a + l.lineTotalPaise, 0)
    : subtotal;
  if (base <= 0) return none("This offer doesn't apply to the items in your cart.");

  let discount = o.discount_type === "percentage" ? Math.floor((base * o.discount_value) / 100) : Math.min(o.discount_value, base);
  if (o.max_discount_paise !== null) discount = Math.min(discount, o.max_discount_paise);
  return { discount: Math.max(0, Math.min(discount, base)) };
}

/** A typed coupon code must be valid or the customer is told why. Without a code, the best automatic offer applies. */
export function chooseOffer(offers: OfferRule[], coupon: string | undefined, lines: PricedLine[], subtotal: number, now: Date): OfferResult {
  const code = coupon?.trim().toUpperCase();
  if (code) {
    const o = offers.find((x) => x.coupon_code?.toUpperCase() === code);
    if (!o) return { offer: null, discountPaise: 0, error: "That coupon code isn't valid." };
    const r = evaluateOffer(o, lines, subtotal, now);
    return r.error ? { offer: null, discountPaise: 0, error: r.error } : { offer: o, discountPaise: r.discount };
  }
  let best: { o: OfferRule; d: number } | null = null;
  for (const o of offers.filter((x) => !x.coupon_code)) {
    const r = evaluateOffer(o, lines, subtotal, now);
    if (r.error || r.discount <= 0) continue;
    if (!best || o.priority > best.o.priority || (o.priority === best.o.priority && r.discount > best.d)) best = { o, d: r.discount };
  }
  return best ? { offer: best.o, discountPaise: best.d } : { offer: null, discountPaise: 0 };
}

// ---- Totals ----------------------------------------------------------------
export type Totals = { subtotal: number; discount: number; deliveryFee: number; total: number };

export function computeTotals(
  subtotal: number, discount: number, orderType: "delivery" | "takeaway",
  cfg: { deliveryFeePaise: number; freeDeliveryThresholdPaise: number | null },
): Totals {
  const free = cfg.freeDeliveryThresholdPaise !== null && subtotal >= cfg.freeDeliveryThresholdPaise;
  const deliveryFee = orderType === "takeaway" || free ? 0 : cfg.deliveryFeePaise;
  const d = Math.min(discount, subtotal);
  return { subtotal, discount: d, deliveryFee, total: subtotal - d + deliveryFee };
}
