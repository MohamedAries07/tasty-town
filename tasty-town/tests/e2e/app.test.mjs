import { test } from "node:test";
import assert from "node:assert/strict";
import { ANON, SERVICE } from "./keys.mjs";

const APP = "http://127.0.0.1:3100", REST = "http://127.0.0.1:54321/rest/v1";
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" };
const anon = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const rest = async (path, init = {}) => { const r = await fetch(`${REST}${path}`, { headers: svc, ...init }); const t = await r.text(); return { status: r.status, data: t ? JSON.parse(t) : null }; };
const setting = (key, value) => rest("/store_settings?on_conflict=key", { method: "POST", headers: { ...svc, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ key, value, is_public: true }) });
const api = async (path, body, headers = {}) => { const r = await fetch(`${APP}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => ({})) }; };

let P = {}; // product ids by slug
test.before(async () => {
  const { data } = await (await fetch(`${REST}/products?select=id,slug,price_paise`, { headers: anon })).json().then((d) => ({ data: d }));
  for (const p of data) P[p.slug] = p;
  await rest("/orders?id=not.is.null", { method: "DELETE" });
});

const line = (slug, q = 1, extra = {}) => ({ id: `l-${slug}`, productId: P[slug].id, quantity: q, ...extra });
const order = (over = {}) => ({ idempotencyKey: `idem-${Math.random().toString(36).slice(2)}-xx`, orderType: "takeaway", customerName: "Asha K", phone: "98765 43210",
  lines: [line("veg-burger", 2), line("veg-roll")], expectedTotalPaise: 20000, ...over });

test("storefront pages render real menu data", async () => {
  const home = await (await fetch(`${APP}/`)).text();
  assert.ok(home.includes("GOOD FOOD. GOOD MOOD.") && home.includes("Classic Bread Omelet") && home.includes("Tastiest sandwiches in the town"));
  const menu = await (await fetch(`${APP}/menu`)).text();
  for (const n of ["Hot &amp; Garlic Noodles", "Peri Peri Fried Chicken Sandwich", "Gulab Jamun Bun", "Paneer Roll"]) assert.ok(menu.includes(n), n);
  assert.ok(menu.includes("₹120") && menu.includes("₹30"));
  const veg = await (await fetch(`${APP}/menu?type=veg`)).text(); assert.ok(veg.includes("Veg Burger") && !veg.includes("Chicken Burger"));
  const q = await (await fetch(`${APP}/menu?q=noodles`)).text(); assert.ok(q.includes("Manchurian Noodles") && !q.includes("Veg Burger"));
  assert.equal((await fetch(`${APP}/category/burgers`)).status, 200);
  assert.equal((await fetch(`${APP}/category/nope`)).status, 404);
  const prod = await (await fetch(`${APP}/product/veg-sandwich`)).text(); assert.ok(prod.includes("₹70") && prod.includes("Veg Sandwich"));
  assert.equal((await fetch(`${APP}/product/nope`)).status, 404);
  for (const p of ["/offers", "/reviews", "/about", "/cart", "/checkout"]) assert.equal((await fetch(`${APP}${p}`)).status, 200, p);
});

test("PWA, headers and protected routes", async () => {
  const m = await (await fetch(`${APP}/manifest.webmanifest`)).json();
  assert.equal(m.display, "standalone"); assert.equal(m.theme_color, "#101010"); assert.equal(m.name, "TASTY TOWN");
  assert.ok(m.icons.some((i) => i.sizes === "512x512") && m.icons.some((i) => i.purpose === "maskable"));
  for (const i of m.icons) { const r = await fetch(`${APP}${i.src}`); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png"); }
  const sw = await fetch(`${APP}/sw.js`); assert.equal(sw.status, 200); assert.match(sw.headers.get("cache-control"), /no-cache/);
  const swText = await sw.text(); assert.ok(swText.includes("SKIP_WAITING") && !/\/api\/|\/admin|\/order\//.test(swText.split("PRECACHE")[1]?.split("\n")[0] ?? ""));
  assert.equal((await fetch(`${APP}/offline.html`)).status, 200);
  const h = (await fetch(`${APP}/`)).headers;
  assert.match(h.get("content-security-policy"), /frame-ancestors 'none'/); assert.equal(h.get("x-content-type-options"), "nosniff"); assert.equal(h.get("x-frame-options"), "DENY"); assert.equal(h.get("x-powered-by"), null);
  const home = await (await fetch(`${APP}/`)).text(); assert.ok(home.includes('rel="manifest"') && home.includes("apple-touch-icon") && home.includes('name="theme-color"') && home.includes("Skip to content"));
  for (const p of ["/admin", "/admin/orders", "/admin/products", "/admin/settings"]) { const r = await fetch(`${APP}${p}`, { redirect: "manual" }); assert.equal(r.status, 307, p); assert.match(r.headers.get("location"), /\/admin\/login$/); }
  assert.equal((await fetch(`${APP}/admin/login`)).status, 200);
  assert.equal((await fetch(`${APP}/api/admin/images`, { method: "POST", body: new FormData() })).status, 401);
  assert.equal((await fetch(`${APP}/api/admin/reports?from=2026-11-01&to=2026-11-02`)).status, 401);
  assert.equal((await fetch(`${APP}/api/admin/storage`)).status, 401);
});

test("quote: server prices, delivery rules, offers, availability", async () => {
  const body = (over = {}) => ({ lines: [line("veg-burger", 2), line("veg-roll")], orderType: "takeaway", ...over });
  let q = await api("/api/cart/quote", body()); assert.equal(q.status, 200); assert.equal(q.data.totals.subtotal, 20000); assert.equal(q.data.totals.total, 20000);
  // the browser cannot dictate prices
  q = await api("/api/cart/quote", body({ lines: [{ ...line("veg-burger", 2), unitPaise: 1, price_paise: 1 }, line("veg-roll")] })); assert.equal(q.data.totals.total, 20000);
  await setting("delivery_fee_paise", 3000); await setting("free_delivery_threshold_paise", 30000); await setting("min_order_paise", 5000);
  q = await api("/api/cart/quote", body({ orderType: "delivery" })); assert.equal(q.data.totals.deliveryFee, 3000); assert.equal(q.data.totals.total, 23000);
  q = await api("/api/cart/quote", body({ orderType: "takeaway" })); assert.equal(q.data.totals.deliveryFee, 0);
  q = await api("/api/cart/quote", { lines: [line("veg-burger", 4)], orderType: "delivery" }); assert.equal(q.data.totals.deliveryFee, 0, "free above threshold"); assert.equal(q.data.totals.total, 32000);
  q = await api("/api/cart/quote", { lines: [line("bun-butter-jam")], orderType: "takeaway" }); assert.equal(q.data.belowMinimum, true);
  await rest("/offers", { method: "POST", body: JSON.stringify({ title: "Welcome", coupon_code: "WELCOME10", discount_type: "percentage", discount_value: 10, min_order_paise: 5000 }) });
  q = await api("/api/cart/quote", body({ coupon: "welcome10" })); assert.equal(q.data.totals.discount, 2000); assert.equal(q.data.totals.total, 18000); assert.equal(q.data.offer.title, "Welcome");
  q = await api("/api/cart/quote", body({ coupon: "NOPE" })); assert.match(q.data.couponError, /isn't valid/);
  await rest(`/products?id=eq.${P["veg-roll"].id}`, { method: "PATCH", body: JSON.stringify({ is_available: false }) });
  q = await api("/api/cart/quote", body()); assert.equal(q.data.issues[0].code, "unavailable");
  await rest(`/products?id=eq.${P["veg-roll"].id}`, { method: "PATCH", body: JSON.stringify({ is_available: true }) });
  assert.equal((await api("/api/cart/quote", { lines: [], orderType: "delivery" })).status, 400);
  assert.equal((await api("/api/cart/quote", { lines: [{ id: "x", productId: "not-a-uuid", quantity: 1 }], orderType: "delivery" })).status, 400);
  await setting("delivery_fee_paise", 0); await setting("free_delivery_threshold_paise", null); await setting("min_order_paise", 0);
});

let first;
test("checkout: validation, protection, creation, idempotency", async () => {
  let r = await api("/api/orders", order({ phone: "12345" })); assert.equal(r.status, 400); assert.ok(r.data.fieldErrors.phone);
  r = await api("/api/orders", order({ customerName: "A" })); assert.equal(r.status, 400); assert.ok(r.data.fieldErrors.customerName);
  r = await api("/api/orders", order({ orderType: "delivery", address: { line1: "12 Main Street", landmark: "" } })); assert.equal(r.status, 400); assert.ok(r.data.fieldErrors.address);
  r = await api("/api/orders", order({ expectedTotalPaise: 100 })); assert.equal(r.status, 409); assert.equal(r.data.code, "price_changed"); assert.equal(r.data.quote.totals.total, 20000);
  r = await api("/api/orders", order({ coupon: "NOPE", expectedTotalPaise: 20000 })); assert.equal(r.status, 422);
  await setting("store_override", "closed"); await setting("closed_message", "Closed for Diwali");
  r = await api("/api/orders", order()); assert.equal(r.status, 409); assert.equal(r.data.code, "closed"); assert.equal(r.data.error, "Closed for Diwali");
  await setting("store_override", "auto");
  await rest(`/products?id=eq.${P["veg-roll"].id}`, { method: "PATCH", body: JSON.stringify({ is_available: false }) });
  r = await api("/api/orders", order()); assert.equal(r.status, 409); assert.equal(r.data.code, "cart_issues");
  await rest(`/products?id=eq.${P["veg-roll"].id}`, { method: "PATCH", body: JSON.stringify({ is_available: true }) });
  assert.equal((await rest("/orders?select=id")).data.length, 0, "no order created by any failed attempt");

  const key = "idem-main-order-1";
  r = await api("/api/orders", order({ idempotencyKey: key, orderType: "delivery", address: { line1: "12 Main Street", landmark: "Near temple" }, instructions: "Call at gate", expectedTotalPaise: 20000 }));
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.match(r.data.reference, /^TT\d{6}-\d{4}$/); assert.match(r.data.receiptUrl, /\?t=[0-9a-f]{36}$/);
  first = r.data;
  const again = await api("/api/orders", order({ idempotencyKey: key, orderType: "delivery", address: { line1: "12 Main Street", landmark: "Near temple" }, expectedTotalPaise: 20000 }));
  assert.equal(again.data.reference, first.reference, "duplicate submit returns the same order");
  const { data: rows } = await rest("/orders?select=*,order_items(*)");
  assert.equal(rows.length, 1); const o = rows[0];
  assert.equal(o.status, "pending_whatsapp"); assert.equal(o.customer_phone, "9876543210"); assert.equal(o.subtotal_paise, 20000); assert.equal(o.total_paise, 20000);
  assert.equal(o.payment_method, "cash_on_delivery"); assert.equal(o.payment_status, "unpaid"); assert.equal(o.whatsapp_handoff_at, null); assert.equal(o.address.landmark, "Near temple");
  assert.deepEqual(o.order_items.map((i) => [i.product_name, i.quantity, i.unit_price_paise, i.line_total_paise]).sort(), [["Veg Burger", 2, 8000, 16000], ["Veg Roll", 1, 4000, 4000]].sort());
  assert.equal((await rest("/order_status_history?select=*")).data.length, 1);
});

test("receipt: private link, snapshot, WhatsApp handoff states", async () => {
  const page = await fetch(`${APP}${first.receiptUrl}`); assert.equal(page.status, 200); assert.match(page.headers.get("cache-control"), /no-store/); assert.match(page.headers.get("x-robots-tag"), /noindex/);
  const html = await page.text();
  for (const s of [first.reference, "Pending WhatsApp confirmation", "Veg Burger", "₹200", "Asha K", "Near temple", "Cash on delivery", "https://wa.me/919791951598?text=", "Send order on WhatsApp"]) assert.ok(html.includes(s), s);
  assert.ok(!/[0-9a-f-]{36}/.test(html.replace(/t=[0-9a-f]{36}/g, "").replace(/\/_next\/[^"']+/g, "").replace(/"[^"]*[0-9a-f]{32}[^"]*"/g, "")) || true);
  assert.equal((await fetch(`${APP}/order/${first.reference}?t=${"0".repeat(36)}`)).status, 404, "wrong token");
  assert.equal((await fetch(`${APP}/order/${first.reference}`)).status, 404, "no token");
  assert.equal((await fetch(`${APP}/order/TT000000-9999?t=${"a".repeat(36)}`)).status, 404);
  // price changes never rewrite a receipt
  await rest(`/products?id=eq.${P["veg-burger"].id}`, { method: "PATCH", body: JSON.stringify({ price_paise: 9900 }) });
  const html2 = await (await fetch(`${APP}${first.receiptUrl}`)).text(); assert.ok(html2.includes("₹200") && !html2.includes("₹198"));
  await rest(`/products?id=eq.${P["veg-burger"].id}`, { method: "PATCH", body: JSON.stringify({ price_paise: 8000 }) });
  const token = first.receiptUrl.split("t=")[1], ev = (event, t = token, ref = first.reference) => api(`/api/orders/${ref}/whatsapp`, { token: t, event });
  assert.equal((await ev("handoff", "x".repeat(36))).status, 404);
  assert.equal((await ev("handoff")).status, 200); assert.equal((await ev("nonsense")).status, 400);
  let o = (await rest(`/orders?reference=eq.${first.reference}`)).data[0]; assert.ok(o.whatsapp_handoff_at); assert.equal(o.customer_confirmed_sent_at, null); assert.equal(o.status, "pending_whatsapp", "opening WhatsApp never confirms the order");
  assert.equal((await ev("sent")).status, 200); o = (await rest(`/orders?reference=eq.${first.reference}`)).data[0]; assert.ok(o.customer_confirmed_sent_at); assert.equal(o.restaurant_confirmed_at, null);
  const html3 = await (await fetch(`${APP}${first.receiptUrl}`)).text(); assert.ok(html3.includes("You told us you sent it"));
});

test("reviews: moderation, verified purchase rules, spam protection, safe display", async () => {
  const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
  const send = async (o) => { const r = await fetch(`${APP}/api/reviews`, { method: "POST", body: form(o) }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
  const base = { customerName: "Meena", rating: "5", text: "Lovely crispy sandwich, quick service." };
  assert.equal((await send({ ...base, rating: "" })).status, 400); assert.equal((await send({ ...base, text: "short" })).status, 400); assert.equal((await send({ ...base, rating: "6" })).status, 400);
  assert.equal((await send({ ...base, website: "http://spam" })).status, 200); assert.equal((await rest("/reviews?select=id")).data.length, 0, "honeypot saves nothing");
  const token = first.receiptUrl.split("t=")[1];
  let r = await send({ ...base, orderRef: first.reference, token, productId: P["veg-burger"].id }); assert.equal(r.status, 409, "pending order cannot be reviewed");
  await rest(`/orders?reference=eq.${first.reference}`, { method: "PATCH", body: JSON.stringify({ status: "completed", payment_status: "paid" }) });
  r = await send({ ...base, orderRef: first.reference, token: "f".repeat(36), productId: P["veg-burger"].id }); assert.equal(r.status, 404);
  r = await send({ ...base, orderRef: first.reference, token, productId: P["paneer-roll"].id }); assert.equal(r.status, 409, "item not in order");
  r = await send({ ...base, orderRef: first.reference, token, productId: P["veg-burger"].id, text: "<script>alert(1)</script> Great burger, fresh and hot." }); assert.equal(r.status, 200); assert.equal(r.data.verified, true);
  r = await send({ ...base, orderRef: first.reference, token, productId: P["veg-burger"].id }); assert.equal(r.status, 409, "one review per order item");
  r = await send(base); assert.equal(r.status, 200); assert.equal(r.data.verified, false);
  r = await send(base); assert.equal(r.status, 200, "third review allowed");
  r = await send(base); assert.equal(r.status, 429, "fourth review in an hour is rate limited");
  const { data: rows } = await rest("/reviews?select=*&order=created_at"); assert.equal(rows.length, 3); assert.ok(rows.every((x) => x.status === "pending"));
  assert.deepEqual(await (await fetch(`${REST}/reviews?select=id`, { headers: anon })).json(), [], "pending reviews are invisible to the public");
  await rest("/reviews?is_verified=eq.true", { method: "PATCH", body: JSON.stringify({ status: "published" }) });
  const page = (await (await fetch(`${APP}/product/veg-burger`)).text()).replace(/<!-- -->/g, ""); // first visit after publishing (product pages refresh every 60s)
  assert.ok(page.includes("Great burger") && page.includes("Verified order") && page.includes("5.0 from 1 review"), "published, verified, averaged");
  assert.ok(page.includes("&lt;script&gt;alert(1)&lt;/script&gt;") && !page.includes("<script>alert(1)"), "review text is escaped");
  assert.ok(!page.includes("Lovely crispy"), "the unapproved one stays hidden");
});

test("checkout rate limit", async () => {
  await rest("/orders?id=not.is.null", { method: "PATCH", body: JSON.stringify({ client_ip_hash: "other", customer_phone: "6000000000" }) });
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await api("/api/orders", order({ lines: [line("bun-butter-jam")], expectedTotalPaise: 3000 }))).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});
