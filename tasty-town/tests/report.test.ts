import { test } from "node:test";
import assert from "node:assert/strict";
import { fillDays, fillHours, cancellationRate, averageOrder, presetRange, daysBetween, csvCell, toCsv, dailyCsv, summaryCsv, hourLabel, type Summary, type Report } from "../src/lib/report.ts";

const sum: Summary = { requests: 10, pending: 2, received: 1, confirmed: 5, completed: 3, cancelled: 2, confirmed_revenue: 50000, recognised_revenue: 30000, discounts: 1000, delivery_fees: 500 };

test("missing days are filled with zeros", () => {
  const d = fillDays("2026-02-27", "2026-03-02", [{ d: "2026-02-28", requests: 2, confirmed: 1, completed: 1, cancelled: 0, confirmed_revenue: 9000, recognised_revenue: 9000 }]);
  assert.deepEqual(d.map((x) => x.d), ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  assert.equal(d[1].confirmed_revenue, 9000); assert.equal(d[2].requests, 0);
  assert.equal(daysBetween("2026-11-01", "2026-11-30"), 30);
  assert.equal(fillHours([{ h: 13, requests: 4, confirmed: 3 }]).length, 24);
});
test("rates and averages", () => {
  assert.equal(cancellationRate(sum), 20); assert.equal(averageOrder(sum), 10000);
  assert.equal(cancellationRate({ ...sum, requests: 0 }), null); assert.equal(averageOrder({ ...sum, confirmed: 0 }), 0);
  assert.equal(hourLabel(0), "12am"); assert.equal(hourLabel(13), "1pm");
});
test("presets", () => {
  assert.deepEqual(presetRange("today", "2026-11-02"), { from: "2026-11-02", to: "2026-11-02" });
  assert.deepEqual(presetRange("yesterday", "2026-03-01"), { from: "2026-02-28", to: "2026-02-28" });
  assert.deepEqual(presetRange("this_month", "2026-11-17"), { from: "2026-11-01", to: "2026-11-17" });
  assert.deepEqual(presetRange("last_month", "2026-11-17"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(presetRange("last_month", "2026-01-05"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(presetRange("last_month", "2026-03-05"), { from: "2026-02-01", to: "2026-02-28" });
});
test("CSV escaping and formula-injection guard", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("+91 97919"), "'+91 97919"); assert.equal(csvCell(-5), "-5"); assert.equal(csvCell("Veg Roll"), "Veg Roll");
  const csv = dailyCsv([{ d: "2026-11-02", requests: 3, confirmed: 2, completed: 1, cancelled: 0, confirmed_revenue: 12050, recognised_revenue: 5000 }]);
  assert.ok(csv.startsWith("\uFEFFDate,")); assert.ok(csv.includes("2026-11-02,3,2,1,0,120.50,50.00"));
  const rep: Report = { summary: sum, daily: [], hourly: [], by_type: [], top_products: [], categories: [] };
  assert.ok(summaryCsv(rep, "2026-11-01", "2026-11-30").includes("Confirmed revenue (INR),500.00"));
  assert.ok(toCsv([["a", "b"]]).endsWith("\r\n"));
});

import { resolveRange } from "../src/lib/range.ts";
test("range resolution validates input", () => {
  const now = new Date("2026-11-17T06:00:00Z");
  assert.deepEqual(resolveRange({}, now), { from: "2026-11-17", to: "2026-11-17", preset: "today", error: null });
  assert.deepEqual(resolveRange({ preset: "last_month" }, now), { from: "2026-10-01", to: "2026-10-31", preset: "last_month", error: null });
  assert.equal(resolveRange({ from: "2026-11-01", to: "2026-11-10" }, now).preset, null);
  assert.ok(resolveRange({ from: "2026-11-10", to: "2026-11-01" }, now).error);
  assert.ok(resolveRange({ from: "2024-01-01", to: "2026-11-01" }, now).error);
  assert.equal(resolveRange({ from: "garbage" }, now).from, "2026-11-17");
});
