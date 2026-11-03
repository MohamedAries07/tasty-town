import type { SupabaseClient } from "@supabase/supabase-js";
import { chooseOffer, computeTotals, priceLines, type CatalogProduct, type LineInput, type LineIssue, type OfferRule, type PricedLine, type Totals } from "./pricing.ts";
import { getStoreStatus, type HoursRow } from "./hours.ts";

export type Quote = {
  lines: PricedLine[]; issues: LineIssue[]; totals: Totals;
  offer: { id: string; title: string } | null; offerRule: OfferRule | null; couponError: string | null;
  minOrderPaise: number; belowMinimum: boolean;
  store: { open: boolean; message: string; deliveryEnabled: boolean; takeawayEnabled: boolean; deliveryFeePaise: number;
    freeDeliveryThresholdPaise: number | null; paymentMethods: string[]; paymentInstructions: string; prepTime: string };
};

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const text = (v: unknown, d = "") => (typeof v === "string" ? v : d);

type ProductRow = {
  id: string; name: string; slug: string; price_paise: number; is_available: boolean; is_archived: boolean; category_id: string | null;
  categories: { name: string } | null;
  product_variants: CatalogProduct["variants"]; product_addons: CatalogProduct["addons"];
};
type OfferRow = Omit<OfferRule, "product_ids" | "category_ids"> & { offer_products: { product_id: string }[]; offer_categories: { category_id: string }[] };

/** Builds a server-authoritative quote. Used by both the cart preview and order creation so they cannot disagree. */
export async function quoteOrder(
  db: SupabaseClient, input: { lines: LineInput[]; orderType: "delivery" | "takeaway"; coupon?: string }, now = new Date(),
): Promise<Quote> {
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const [prod, off, set, hrs] = await Promise.all([
    ids.length ? db.from("products").select("id,name,slug,price_paise,is_available,is_archived,category_id,categories(name),product_variants(id,name,price_delta_paise,is_available,is_default),product_addons(id,name,price_paise,is_available)").in("id", ids) : Promise.resolve({ data: [], error: null }),
    db.from("offers").select("*,offer_products(product_id),offer_categories(category_id)"),
    db.from("store_settings").select("key,value"),
    db.from("store_hours").select("day_of_week,special_date,opens_at,closes_at,is_closed,note"),
  ]);
  const err = prod.error ?? off.error ?? set.error ?? hrs.error;
  if (err) throw err;

  const catalog = new Map<string, CatalogProduct>();
  for (const p of (prod.data ?? []) as unknown as ProductRow[]) {
    catalog.set(p.id, { id: p.id, name: p.name, slug: p.slug, price_paise: p.price_paise, is_available: p.is_available, is_archived: p.is_archived,
      category_id: p.category_id, category_name: p.categories?.name ?? null, variants: p.product_variants, addons: p.product_addons });
  }
  const s: Record<string, unknown> = Object.fromEntries((set.data ?? []).map((r) => [r.key, r.value]));
  const offers: OfferRule[] = ((off.data ?? []) as unknown as OfferRow[]).map(({ offer_products, offer_categories, ...o }) => ({
    ...o, product_ids: offer_products.map((x) => x.product_id), category_ids: offer_categories.map((x) => x.category_id) }));

  const { lines, issues } = priceLines(input.lines, catalog);
  const subtotal = lines.reduce((a, l) => a + l.lineTotalPaise, 0);
  const picked = chooseOffer(offers, input.coupon, lines, subtotal, now);
  const threshold = typeof s.free_delivery_threshold_paise === "number" ? s.free_delivery_threshold_paise : null;
  const deliveryFeePaise = num(s.delivery_fee_paise, 0);
  const totals = computeTotals(subtotal, picked.discountPaise, input.orderType, { deliveryFeePaise, freeDeliveryThresholdPaise: threshold });
  const minOrderPaise = num(s.min_order_paise, 0);
  const status = getStoreStatus({
    ordersEnabled: bool(s.orders_enabled, true),
    override: s.store_override === "open" || s.store_override === "closed" ? s.store_override : (bool(s.temporarily_closed, false) ? "closed" : "auto"),
    closedMessage: text(s.closed_message),
  }, (hrs.data ?? []) as HoursRow[], now);

  return {
    lines, issues, totals, offer: picked.offer ? { id: picked.offer.id, title: picked.offer.title } : null, offerRule: picked.offer,
    couponError: input.coupon?.trim() ? picked.error ?? null : null, minOrderPaise, belowMinimum: subtotal < minOrderPaise,
    store: { open: status.open, message: status.message, deliveryEnabled: bool(s.delivery_enabled, true), takeawayEnabled: bool(s.takeaway_enabled, true),
      deliveryFeePaise, freeDeliveryThresholdPaise: threshold, paymentMethods: Array.isArray(s.payment_methods) ? s.payment_methods as string[] : ["cash_on_delivery", "pay_at_pickup"],
      paymentInstructions: text(s.payment_instructions), prepTime: text(s.prep_time) },
  };
}
