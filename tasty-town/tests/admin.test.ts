import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStatuses } from "../src/lib/orders.ts";
import { summarizeOrders, topProducts } from "../src/lib/metrics.ts";
import { istRange, istLocalToISO, isoToIstLocal, todayIST, isDate } from "../src/lib/dates.ts";
import { parseRupees, paiseToInput, slugify } from "../src/lib/money.ts";

test("status transitions by order type and role", () => {
  assert.deepEqual(nextStatuses("pending_whatsapp", "delivery", "manager"), ["received", "confirmed", "cancelled"]);
  assert.deepEqual(nextStatuses("ready", "takeaway", "manager"), ["completed", "cancelled"]);
  assert.deepEqual(nextStatuses("ready", "delivery", "manager"), ["out_for_delivery", "cancelled"]);
  assert.deepEqual(nextStatuses("pending_whatsapp", "delivery", "staff"), ["received", "confirmed"]);
  assert.deepEqual(nextStatuses("completed", "delivery", "super_admin"), []);
  assert.deepEqual(nextStatuses("cancelled", "takeaway", "super_admin"), []);
});
test("pending and cancelled orders are never revenue", () => {
  const s = summarizeOrders([
    { status: "pending_whatsapp", total_paise: 10000, payment_status: "unpaid" },
    { status: "received", total_paise: 5000, payment_status: "unpaid" },
    { status: "confirmed", total_paise: 20000, payment_status: "unpaid" },
    { status: "completed", total_paise: 30000, payment_status: "paid" },
    { status: "completed", total_paise: 7000, payment_status: "unpaid" },
    { status: "cancelled", total_paise: 99999, payment_status: "unpaid" },
  ]);
  assert.equal(s.requests, 6); assert.equal(s.pending, 1); assert.equal(s.confirmed, 3); assert.equal(s.completed, 2); assert.equal(s.cancelled, 1);
  assert.equal(s.confirmedRevenue, 57000); assert.equal(s.recognisedRevenue, 30000); assert.equal(s.averageOrderPaise, 19000);
  assert.equal(summarizeOrders([]).averageOrderPaise, 0);
});
test("top products group by name", () => {
  const t = topProducts([{ product_name: "A", quantity: 2, line_total_paise: 200 }, { product_name: "B", quantity: 5, line_total_paise: 500 }, { product_name: "A", quantity: 4, line_total_paise: 400 }], 2);
  assert.deepEqual(t.map((x) => [x.name, x.quantity]), [["A", 6], ["B", 5]]);
});
test("IST date handling", () => {
  const r = istRange("2026-11-02", "2026-11-02");
  assert.equal(r.startISO, "2026-11-01T18:30:00.000Z"); assert.equal(r.endISO, "2026-11-02T18:30:00.000Z");
  assert.equal(todayIST(new Date("2026-11-01T19:00:00Z")), "2026-11-02");
  assert.equal(istLocalToISO("2026-11-02T10:00"), "2026-11-02T04:30:00.000Z");
  assert.equal(istLocalToISO("garbage"), null);
  assert.equal(isoToIstLocal("2026-11-02T04:30:00.000Z"), "2026-11-02T10:00");
  assert.equal(isDate("2026-13-45"), false);
});
test("rupee parsing never uses floats", () => {
  assert.equal(parseRupees("50"), 5000); assert.equal(parseRupees("50.5"), 5050); assert.equal(parseRupees("0.07"), 7); assert.equal(parseRupees("19.99"), 1999);
  for (const bad of ["", "-5", "5.555", "abc", "1e3", "1,000"]) assert.equal(parseRupees(bad), null);
  assert.equal(paiseToInput(5000), "50"); assert.equal(paiseToInput(5050), "50.50");
  assert.equal(slugify("Hot & Garlic Noodles"), "hot-and-garlic-noodles");
});
