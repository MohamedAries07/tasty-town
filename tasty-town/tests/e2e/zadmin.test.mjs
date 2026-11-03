// Runs after app.test.mjs (alphabetical, sequential) so the database already holds real orders and reviews.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { ANON, SERVICE, sign } from "./keys.mjs";

const APP = "http://127.0.0.1:3100", REST = "http://127.0.0.1:54321/rest/v1";
const U = { owner: "00000000-0000-0000-0000-00000000b001", manager: "00000000-0000-0000-0000-00000000b002", staff: "00000000-0000-0000-0000-00000000b003", nobody: "00000000-0000-0000-0000-00000000b004" };
const jwt = (id) => sign({ role: "authenticated", sub: id, aud: "authenticated" });
const cookie = (id) => { const session = { access_token: jwt(id), refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: { id, aud: "authenticated", role: "authenticated", email: `${id.slice(-4)}@test.local` } }; return `sb-127-auth-token=${encodeURIComponent(JSON.stringify(session))}`; };
const get = (path, who, init = {}) => fetch(`${APP}${path}`, { redirect: "manual", headers: { cookie: cookie(U[who]) }, ...init });
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" };
const rpc = async (fn, body, who) => { const r = await fetch(`${REST}/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${jwt(U[who])}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const t = await r.text(); return { status: r.status, data: t ? JSON.parse(t) : null }; };
const sql = (q) => { writeFileSync("/tmp/e2e.sql", q); execSync('su postgres -c "psql -q -d tt_e2e -f /tmp/e2e.sql"'); };
const BAD = ["Couldn’t load", "Something went wrong", "Application error", "does not exist"];
const ok = async (path, who, expectText) => { const r = await get(path, who); const t = await r.text(); assert.equal(r.status, 200, `${who} ${path} -> ${r.status}`); for (const b of BAD) assert.ok(!t.includes(b), `${path} shows "${b}"`); if (expectText) assert.ok(t.replace(/<!-- -->/g, "").includes(expectText), `${path} should show "${expectText}"`); return t; };

let orders, reviewId, productId, categoryId, offerId;
test.before(async () => {
  sql(`insert into auth.users(id,email) values ('${U.owner}','owner@t'),('${U.manager}','manager@t'),('${U.staff}','staff@t'),('${U.nobody}','n@t') on conflict do nothing;
       insert into admin_roles(user_id, role) values ('${U.owner}','super_admin'),('${U.manager}','manager'),('${U.staff}','staff') on conflict do nothing;`);
  orders = await (await fetch(`${REST}/orders?select=id,reference,status,total_paise&order=created_at`, { headers: svc })).json();
  reviewId = (await (await fetch(`${REST}/reviews?select=id&limit=1`, { headers: svc })).json())[0].id;
  productId = (await (await fetch(`${REST}/products?select=id&slug=eq.veg-burger`, { headers: svc })).json())[0].id;
  categoryId = (await (await fetch(`${REST}/categories?select=id&limit=1`, { headers: svc })).json())[0].id;
  offerId = (await (await fetch(`${REST}/offers?select=id&limit=1`, { headers: svc })).json())[0].id;
});

test("access control by role", async () => {
  for (const p of ["/admin", "/admin/orders", "/admin/products"]) { const r = await get(p, "nobody"); assert.equal(r.status, 307, `non-admin ${p}`); assert.match(r.headers.get("location"), /\/admin\/login$/); }
  for (const p of ["/admin/products", "/admin/categories", "/admin/offers", "/admin/settings", "/admin/staff", "/admin/reviews", "/admin/reports"]) {
    const r = await get(p, "staff"); const body = r.status === 307 ? "" : await r.text();
    assert.ok(r.status === 307 || /(manager|owner) access|need manager access/.test(body), `staff must not see ${p} (${r.status}) ${body.slice(body.indexOf('<body'), body.indexOf('<body') + 600)} ... ${(body.match(/NEXT_REDIRECT[^<]{0,80}/) ?? [''])[0]}`);
    assert.ok(!body.includes("Classic Bread Omelet") && !body.includes("Meena"), `${p} leaked data to staff`); }
  for (const p of ["/admin/settings", "/admin/staff"]) { const r = await get(p, "manager"); assert.equal(r.status, 307, `manager ${p}`); }
  assert.match(await (await get("/admin/media", "staff")).text(), /needs manager access/);
  assert.match(await (await get("/admin/analytics", "staff")).text(), /need manager access/);
  assert.match(await (await get("/admin/customers", "staff")).text(), /need manager access/);
  assert.equal((await get("/api/admin/reports?from=2026-11-01&to=2026-11-02", "staff")).status, 403);
  assert.equal((await get("/api/admin/storage", "staff")).status, 403);
  assert.equal((await get("/api/admin/reports?from=2026-11-01&to=2026-11-02", "nobody")).status, 401);
});

test("staff pages render with live data", async () => {
  await ok("/admin", "staff", "Order requests");
  const list = await ok("/admin/orders", "staff", orders[0].reference);
  assert.ok(list.includes("Pending WhatsApp confirmation") && list.includes("Completed"));
  await ok(`/admin/orders?q=${orders[0].reference}`, "staff", orders[0].reference);
  await ok("/admin/orders?status=completed&type=delivery&from=2026-01-01&to=2030-01-01", "staff", orders[0].reference);
  assert.ok(!(await (await get("/admin/orders?q=ZZZZ", "staff")).text()).includes(orders[0].reference));
  const done = orders.find((o) => o.status === "completed"), pend = orders.find((o) => o.status === "pending_whatsapp");
  const d = await ok(`/admin/orders/${done.id}`, "staff", "Veg Burger"); assert.ok(d.includes("No further changes") || d.includes("completed"));
  const p = await ok(`/admin/orders/${pend.id}`, "staff", "Update status"); assert.ok(p.includes("Mark received") && p.includes("Mark confirmed") && !p.includes("Cancel / reject"), "staff cannot see cancel");
  assert.match(await (await get("/admin/orders/not-a-uuid", "staff")).text(), /Page not found/);
  await ok("/admin/account", "staff");
});

test("manager pages render with live data", async () => {
  const pend = orders.find((o) => o.status === "pending_whatsapp");
  assert.ok((await ok(`/admin/orders/${pend.id}`, "manager")).includes("Cancel / reject"), "manager can cancel");
  const ov = await ok("/admin", "manager", "Confirmed revenue"); assert.ok(ov.includes("waiting for approval"), "pending reviews flagged");
  await ok("/admin/products", "manager", "Classic Bread Omelet"); await ok("/admin/products?q=burger&archived=0", "manager", "Veg Burger"); await ok("/admin/products?archived=1", "manager", "No products found");
  await ok("/admin/products/new", "manager", "Create product"); await ok(`/admin/products/${productId}`, "manager", "Delete product");
  await ok("/admin/categories", "manager", "Add a category"); await ok("/admin/offers", "manager", "Welcome"); await ok("/admin/offers/new", "manager", "Create offer"); await ok(`/admin/offers/${offerId}`, "manager", "WELCOME10");
  await ok("/admin/reviews", "manager"); await ok("/admin/reviews?status=all", "manager", "Meena"); await ok("/admin/reviews?status=published&rating=5&q=burger", "manager", "Great burger");
  await ok("/admin/reviews/new", "manager", "Never invent reviews"); await ok(`/admin/reviews/${reviewId}`, "manager", "Photos");
  await ok("/admin/customers", "manager", "9876543210"); await ok("/admin/customers?q=asha", "manager", "Asha K"); await ok("/admin/customers/9876543210", "manager", "Confirmed spend");
  assert.match(await (await get("/admin/customers/1111111111", "manager")).text(), /Page not found/);
  await ok("/admin/media", "manager", "Storage"); await ok("/admin/media?tab=product&id=" + productId, "manager");
  await ok("/admin/reports", "manager", "Full report"); await ok("/admin/reports?preset=this_month", "manager");
  const an = await ok("/admin/analytics?preset=this_month", "manager", "Confirmed revenue");
  assert.ok(an.includes("Order requests") && an.includes("Delivery versus takeaway") && an.includes("Top products") && an.includes("Peak"));
  await ok("/admin/analytics?from=2026-01-01&to=2026-12-31", "manager"); assert.match(await (await get("/admin/analytics?from=2020-01-01&to=2026-12-31", "manager")).text(), /366 days or less/);
});

test("owner pages and dashboard numbers match the database", async () => {
  await ok("/admin/settings", "owner", "Weekly opening hours"); await ok("/admin/staff", "owner", "Add someone");
  const { data } = await rpc("analytics_report", { p_from: "2020-01-01T00:00:00Z", p_to: "2030-01-01T00:00:00Z" }, "manager");
  const s = data.summary;
  assert.equal(s.requests, orders.length); assert.equal(s.confirmed, 1); assert.equal(s.completed, 1); assert.equal(s.pending, orders.length - 1);
  assert.equal(s.confirmed_revenue, 20000, "pending orders are not revenue"); assert.equal(s.recognised_revenue, 20000);
  assert.equal(data.top_products[0].name, "Veg Burger"); assert.equal(data.top_products[0].quantity, 2);
  const cs = await rpc("customer_summary", { p_search: null, p_limit: 25, p_offset: 0 }, "manager"); assert.ok(cs.data.length >= 1);
  assert.equal((await rpc("analytics_report", { p_from: "2020-01-01T00:00:00Z", p_to: "2030-01-01T00:00:00Z" }, "staff")).status >= 400, true, "staff blocked at the API");
});

test("staff cannot bypass the order workflow through the API", async () => {
  const pend = orders.find((o) => o.status === "pending_whatsapp");
  const patch = await fetch(`${REST}/orders?id=eq.${pend.id}`, { method: "PATCH", headers: { apikey: ANON, Authorization: `Bearer ${jwt(U.staff)}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ total_paise: 1, status: "completed" }) });
  assert.deepEqual(await patch.json(), [], "direct update touches nothing");
  let r = await rpc("admin_set_order_status", { p_order: pend.id, p_status: "cancelled", p_note: null }, "staff"); assert.ok(r.status >= 400 && JSON.stringify(r.data).includes("not_allowed"));
  r = await rpc("admin_set_order_status", { p_order: pend.id, p_status: "completed", p_note: null }, "staff"); assert.ok(JSON.stringify(r.data).includes("bad_transition"));
  r = await rpc("admin_set_order_status", { p_order: pend.id, p_status: "confirmed", p_note: "ok via api" }, "staff"); assert.equal(r.status, 204);
  assert.ok((await get(`/admin/orders/${pend.id}`, "staff")).status === 200);
  const t = await (await get(`/admin/orders/${pend.id}`, "staff")).text(); assert.ok(t.includes("ok via api") && t.includes("Mark preparing"), "history and next steps update");
  r = await rpc("admin_update_order", { p_order: pend.id, p_notes: "Regular customer", p_payment: "paid" }, "staff"); assert.equal(r.status, 204);
  const { data } = await rpc("analytics_report", { p_from: "2020-01-01T00:00:00Z", p_to: "2030-01-01T00:00:00Z" }, "manager");
  assert.equal(data.summary.confirmed, 2); assert.equal(data.summary.confirmed_revenue, 20000 + pend.total_paise);
});

test("reports: PDF and CSV exports", async () => {
  const q = "from=2026-01-01&to=2026-12-31";
  const pdf = await get(`/api/admin/reports?${q}&format=pdf`, "manager"); assert.equal(pdf.status, 200); assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.match(pdf.headers.get("content-disposition"), /tasty-town-report-2026-01-01_2026-12-31\.pdf/); assert.match(pdf.headers.get("cache-control"), /no-store/);
  const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0, 5).toString(), "%PDF-"); assert.ok(bytes.length > 20000);
  writeFileSync("/tmp/e2e-report.pdf", bytes);
  const csv = async (kind) => { const r = await get(`/api/admin/reports?${q}&format=csv&kind=${kind}`, "manager"); assert.equal(r.status, 200, kind); assert.match(r.headers.get("content-type"), /text\/csv/); return r.text(); };
  const summary = await csv("summary"); assert.ok(summary.includes("Confirmed revenue (INR),") && summary.includes("Order requests"));
  const daily = await csv("daily"); assert.ok(daily.split("\r\n")[0].includes("Confirmed revenue (INR)") && daily.split("\r\n").length > 300, "every day of the range is listed");
  const prods = await csv("products"); assert.ok(prods.includes("Product,Veg Burger"));
  const ord = await csv("orders"); assert.ok(ord.includes(orders[0].reference) && ord.includes("9876543210") && ord.startsWith("Order,Placed (IST)"));
  const raw = Buffer.from(await (await get(`/api/admin/reports?${q}&format=csv&kind=orders`, "manager")).arrayBuffer()); assert.deepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM so Excel shows ₹ and names correctly");
  for (const bad of ["from=2026-12-01&to=2026-11-01", "from=nope&to=2026-11-01", "from=2020-01-01&to=2026-11-01"]) assert.equal((await get(`/api/admin/reports?${bad}&format=pdf`, "manager")).status, 400, bad);
  assert.equal((await get(`/api/admin/reports?${q}&format=csv&kind=hack`, "manager")).status, 400);
  const audit = await (await fetch(`${REST}/audit_logs?action=eq.report.export&select=id`, { headers: svc })).json(); assert.ok(audit.length >= 5, "exports are logged");
});
