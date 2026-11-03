import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase";
import { serviceClient } from "@/lib/supabase-admin";
import { quoteOrder } from "@/lib/order-quote";
import { orderSchema } from "@/lib/order-schema";
import { normalizeIndianMobile } from "@/lib/phone";

export const runtime = "nodejs";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS_PER_WINDOW = 5;
const fail = (error: string, status: number, extra: object = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return fail("Please check the highlighted fields.", 400, { fieldErrors });
  }
  const b = parsed.data;

  const phone = normalizeIndianMobile(b.phone);
  if (!phone) return fail("Enter a valid 10-digit Indian mobile number.", 400, { fieldErrors: { phone: "Enter a valid 10-digit Indian mobile number." } });
  if (b.orderType === "delivery" && (!b.address || b.address.line1.length < 5 || b.address.landmark.length < 2)) {
    return fail("Enter your delivery address and a landmark.", 400, { fieldErrors: { address: "Enter your delivery address and a landmark." } });
  }

  const anon = publicClient();
  if (!anon) return fail("Ordering is temporarily unavailable.", 503);
  let service;
  try { service = serviceClient(); } catch { return fail("Ordering is temporarily unavailable.", 503); }

  let quote;
  try { quote = await quoteOrder(anon, b); } catch (e) { console.error("[order-quote]", e); return fail("Couldn't price your order. Please try again.", 500); }

  if (!quote.store.open) return fail(quote.store.message || "We're closed right now.", 409, { code: "closed" });
  if (b.orderType === "delivery" && !quote.store.deliveryEnabled) return fail("Home delivery isn't available right now. Try takeaway.", 409);
  if (b.orderType === "takeaway" && !quote.store.takeawayEnabled) return fail("Takeaway isn't available right now.", 409);
  if (quote.issues.length) return fail(quote.issues[0].message, 409, { code: "cart_issues", issues: quote.issues });
  if (quote.couponError) return fail(quote.couponError, 422, { fieldErrors: { coupon: quote.couponError } });
  if (quote.belowMinimum) return fail(`The minimum order is ₹${(quote.minOrderPaise / 100).toString()}.`, 422);
  if (quote.totals.total !== b.expectedTotalPaise) {
    const { offerRule: _omit, ...q } = quote;
    return fail("Prices or offers changed. Please review your updated total.", 409, { code: "price_changed", quote: q });
  }
  const paymentMethod = b.orderType === "delivery" ? "cash_on_delivery" : "pay_at_pickup";
  if (!quote.store.paymentMethods.includes(paymentMethod)) return fail("That payment option isn't available right now.", 409);

  // Public checkout rate limit (per phone and per network address).
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex").slice(0, 32);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await service.from("orders").select("id", { count: "exact", head: true })
    .or(`client_ip_hash.eq.${ipHash},customer_phone.eq.${phone}`).gte("created_at", since).neq("idempotency_key", b.idempotencyKey);
  if ((count ?? 0) >= MAX_ORDERS_PER_WINDOW) return fail("Too many orders in a short time. Please wait a few minutes or call us.", 429);

  const { data, error } = await service.rpc("create_order", { p: {
    idempotency_key: b.idempotencyKey, customer_name: b.customerName, customer_phone: phone, order_type: b.orderType,
    address: b.orderType === "delivery" ? { line1: b.address!.line1, landmark: b.address!.landmark } : null,
    subtotal_paise: quote.totals.subtotal, discount_paise: quote.totals.discount, delivery_fee_paise: quote.totals.deliveryFee, total_paise: quote.totals.total,
    offer_id: quote.offer?.id ?? null, offer_snapshot: quote.offerRule ? { id: quote.offerRule.id, title: quote.offerRule.title, coupon_code: quote.offerRule.coupon_code,
      discount_type: quote.offerRule.discount_type, discount_value: quote.offerRule.discount_value } : null,
    payment_method: paymentMethod, special_instructions: b.instructions ?? "", client_ip_hash: ipHash,
    items: quote.lines.map((l) => ({ product_id: l.productId, product_name: l.name, category_name: l.categoryName, quantity: l.quantity,
      unit_price_paise: l.unitPaise, line_total_paise: l.lineTotalPaise,
      selected_options: { variant: l.variantName, addons: l.addons.map((a) => ({ name: a.name, price_paise: a.price_paise })), notes: l.notes } })),
  } });

  if (error) {
    if (error.message.includes("offer_exhausted")) return fail("That offer was just fully redeemed. Please review your order.", 409, { code: "price_changed" });
    console.error("[create_order]", error);
    return fail("We couldn't place your order. Please try again.", 500);
  }
  const r = data as { reference: string; receipt_token: string };
  return NextResponse.json({ reference: r.reference, receiptUrl: `/order/${r.reference}?t=${r.receipt_token}` });
}
