import { test } from "node:test";
import assert from "node:assert/strict";
import { priceLines, evaluateOffer, chooseOffer, computeTotals, type CatalogProduct, type OfferRule } from "../src/lib/pricing.ts";
import { normalizeIndianMobile } from "../src/lib/phone.ts";
import { getStoreStatus, type HoursRow } from "../src/lib/hours.ts";
import { buildWhatsAppMessage } from "../src/lib/whatsapp.ts";
import { whatsappLink } from "../src/lib/format.ts";

const burger: CatalogProduct = { id: "p1", name: "Veg Burger", slug: "veg-burger", price_paise: 8000, is_available: true, is_archived: false, category_id: "c1", category_name: "Burgers",
  variants: [{ id: "v1", name: "Large", price_delta_paise: 2000, is_available: true, is_default: false }], addons: [{ id: "a1", name: "Extra cheese", price_paise: 1000, is_available: true }] };
const roll: CatalogProduct = { id: "p2", name: "Veg Roll", slug: "veg-roll", price_paise: 4000, is_available: true, is_archived: false, category_id: "c2", category_name: "Rolls", variants: [], addons: [] };
const cat = new Map([burger, roll].map((p) => [p.id, p]));
const offer = (o: Partial<OfferRule>): OfferRule => ({ id: "o1", title: "T", coupon_code: null, discount_type: "percentage", discount_value: 10, min_order_paise: 0, max_discount_paise: null,
  starts_at: null, ends_at: null, is_active: true, priority: 0, usage_limit: null, usage_count: 0, product_ids: [], category_ids: [], ...o });
const now = new Date("2026-11-02T04:30:00Z");

test("variants and add-ons are priced from the catalogue", () => {
  const r = priceLines([{ id: "l", productId: "p1", variantId: "v1", addonIds: ["a1", "a1"], quantity: 2 }], cat);
  assert.equal(r.issues.length, 0);
  assert.equal(r.lines[0].unitPaise, 11000); assert.equal(r.lines[0].lineTotalPaise, 22000);
});
test("items without variants don't force a selection; items with variants do", () => {
  assert.equal(priceLines([{ id: "l", productId: "p2", quantity: 1 }], cat).issues.length, 0);
  assert.equal(priceLines([{ id: "l", productId: "p1", quantity: 1 }], cat).issues[0].code, "variant_required");
});
test("rejects unavailable, unknown, bad variant, bad add-on, bad quantity", () => {
  const sold = new Map(cat); sold.set("p2", { ...roll, is_available: false });
  assert.equal(priceLines([{ id: "l", productId: "p2", quantity: 1 }], sold).issues[0].code, "unavailable");
  assert.equal(priceLines([{ id: "l", productId: "zz", quantity: 1 }], cat).issues[0].code, "not_found");
  assert.equal(priceLines([{ id: "l", productId: "p1", variantId: "nope", quantity: 1 }], cat).issues[0].code, "bad_variant");
  assert.equal(priceLines([{ id: "l", productId: "p1", variantId: "v1", addonIds: ["x"], quantity: 1 }], cat).issues[0].code, "bad_addon");
  for (const q of [0, -1, 21, 1.5]) assert.equal(priceLines([{ id: "l", productId: "p2", quantity: q }], cat).issues[0].code, "bad_quantity");
});
test("percentage offer is capped; fixed offer never exceeds subtotal", () => {
  const { lines } = priceLines([{ id: "l", productId: "p2", quantity: 5 }], cat); // 20000
  assert.equal(evaluateOffer(offer({ discount_value: 10 }), lines, 20000, now).discount, 2000);
  assert.equal(evaluateOffer(offer({ discount_value: 50, max_discount_paise: 3000 }), lines, 20000, now).discount, 3000);
  assert.equal(evaluateOffer(offer({ discount_type: "fixed", discount_value: 99999 }), lines, 20000, now).discount, 20000);
});
test("offer rules: min order, expiry, schedule, usage, scope", () => {
  const { lines } = priceLines([{ id: "l", productId: "p2", quantity: 1 }], cat); // 4000
  assert.match(evaluateOffer(offer({ min_order_paise: 10000 }), lines, 4000, now).error!, /Add ₹60 more/);
  assert.match(evaluateOffer(offer({ ends_at: "2026-11-01T00:00:00Z" }), lines, 4000, now).error!, /expired/);
  assert.match(evaluateOffer(offer({ starts_at: "2026-12-01T00:00:00Z" }), lines, 4000, now).error!, /hasn't started/);
  assert.match(evaluateOffer(offer({ usage_limit: 5, usage_count: 5 }), lines, 4000, now).error!, /redeemed/);
  assert.match(evaluateOffer(offer({ category_ids: ["c1"] }), lines, 4000, now).error!, /doesn't apply/);
  assert.equal(evaluateOffer(offer({ category_ids: ["c2"] }), lines, 4000, now).discount, 400);
});
test("coupon codes: case-insensitive, invalid explained, auto offers by priority", () => {
  const { lines } = priceLines([{ id: "l", productId: "p2", quantity: 5 }], cat);
  const offers = [offer({ id: "a", coupon_code: "SAVE", discount_value: 20 }), offer({ id: "b", priority: 1, discount_value: 5 }), offer({ id: "c", priority: 2, discount_value: 1 })];
  assert.equal(chooseOffer(offers, "save", lines, 20000, now).offer?.id, "a");
  assert.match(chooseOffer(offers, "NOPE", lines, 20000, now).error!, /isn't valid/);
  assert.equal(chooseOffer(offers, undefined, lines, 20000, now).offer?.id, "c");
});
test("totals: delivery fee, free threshold, takeaway", () => {
  const cfg = { deliveryFeePaise: 3000, freeDeliveryThresholdPaise: 20000 };
  assert.equal(computeTotals(10000, 1000, "delivery", cfg).total, 12000);
  assert.equal(computeTotals(20000, 0, "delivery", cfg).deliveryFee, 0);
  assert.equal(computeTotals(10000, 0, "takeaway", cfg).deliveryFee, 0);
  assert.equal(computeTotals(5000, 9999, "takeaway", cfg).total, 0);
});
test("Indian mobile validation", () => {
  for (const ok of ["9791951598", "+91 97919 51598", "09791951598", "919791951598"]) assert.equal(normalizeIndianMobile(ok), "9791951598");
  for (const bad of ["12345", "5791951598", "97919515", "abcdefghij", ""]) assert.equal(normalizeIndianMobile(bad), null);
});
test("opening hours in Asia/Kolkata", () => {
  const cfg = { ordersEnabled: true, override: "auto" as const, closedMessage: "" };
  const wk = (dow: number, o: string, c: string): HoursRow => ({ day_of_week: dow, special_date: null, opens_at: o, closes_at: c, is_closed: false });
  const monday = [wk(1, "10:00:00", "22:00:00")];
  assert.equal(getStoreStatus(cfg, monday, new Date("2026-11-02T04:30:00Z")).open, true);   // Mon 10:00 IST
  assert.equal(getStoreStatus(cfg, monday, new Date("2026-11-02T04:29:00Z")).open, false);  // 09:59 IST
  assert.equal(getStoreStatus(cfg, monday, new Date("2026-11-03T04:30:00Z")).open, false);  // Tuesday, no row
  assert.equal(getStoreStatus(cfg, [], new Date()).open, true);
  const holiday: HoursRow = { day_of_week: null, special_date: "2026-11-02", opens_at: null, closes_at: null, is_closed: true, note: "Closed for Diwali" };
  assert.equal(getStoreStatus(cfg, [...monday, holiday], new Date("2026-11-02T06:00:00Z")).message, "Closed for Diwali");
  assert.equal(getStoreStatus({ ...cfg, override: "closed" }, [], new Date()).open, false);
  assert.equal(getStoreStatus({ ...cfg, override: "open" }, monday, new Date("2026-11-03T04:30:00Z")).open, true);
  const night = [wk(1, "18:00:00", "02:00:00")];
  assert.equal(getStoreStatus(cfg, night, new Date("2026-11-02T19:30:00Z")).open, true);   // Tue 01:00 IST, Monday's overnight shift
  assert.equal(getStoreStatus(cfg, night, new Date("2026-11-02T20:30:00Z")).open, false);  // Tue 02:00 IST, shift ended
});
test("WhatsApp message contains required fields and encodes safely", () => {
  const msg = buildWhatsAppMessage("TASTY TOWN", { reference: "TT261102-0001", customer_name: "Arun & Co", customer_phone: "9791951598", order_type: "delivery",
    address: { line1: "12 Main St", landmark: "Near temple" },
    items: [{ product_name: "Veg Burger", quantity: 2, unit_price_paise: 11000, line_total_paise: 22000, selected_options: { variant: "Large", addons: [{ name: "Extra cheese", price_paise: 1000 }], notes: "no onion" } }],
    subtotal_paise: 22000, discount_paise: 2000, delivery_fee_paise: 3000, total_paise: 23000, special_instructions: "Call at gate" });
  for (const s of ["TT261102-0001", "Arun & Co", "9791951598", "Veg Burger × 2", "Large", "Extra cheese", "no onion", "₹220", "-₹20", "₹30", "*Total: ₹230*", "Near temple", "Call at gate"]) assert.ok(msg.includes(s), s);
  const url = whatsappLink("+919791951598", msg);
  assert.ok(url.startsWith("https://wa.me/919791951598?text="));
  assert.ok(!/[\s&]/.test(url.split("?text=")[1]));
});
