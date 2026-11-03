import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderReportPdf } from "../src/lib/report-pdf.ts";
import type { Report } from "../src/lib/report.ts";

const report: Report = {
  summary: { requests: 12, pending: 2, received: 1, confirmed: 7, completed: 5, cancelled: 2, confirmed_revenue: 123450, recognised_revenue: 80000, discounts: 5000, delivery_fees: 3000 },
  daily: [{ d: "2026-11-02", requests: 6, confirmed: 4, completed: 3, cancelled: 1, confirmed_revenue: 60000, recognised_revenue: 40000 }, { d: "2026-11-04", requests: 6, confirmed: 3, completed: 2, cancelled: 1, confirmed_revenue: 63450, recognised_revenue: 40000 }],
  hourly: [{ h: 13, requests: 5, confirmed: 3 }, { h: 20, requests: 7, confirmed: 4 }],
  by_type: [{ order_type: "delivery", requests: 8, confirmed: 5, confirmed_revenue: 90000 }, { order_type: "takeaway", requests: 4, confirmed: 2, confirmed_revenue: 33450 }],
  top_products: Array.from({ length: 10 }, (_, i) => ({ name: `Peri Peri Fried Chicken Sandwich ${i}`, quantity: 10 - i, revenue: (10 - i) * 12000 })),
  categories: [{ name: "Sandwiches — Chicken", quantity: 20, revenue: 240000 }, { name: "Burgers", quantity: 9, revenue: 90000 }],
};

test("PDF renders with branding, ₹ amounts and page count", async () => {
  const bytes = await renderReportPdf(report, { restaurant: "TASTY TOWN", tagline: "Tastiest sandwiches in the town", from: "2026-11-01", to: "2026-11-30", generatedAt: new Date("2026-11-30T12:00:00Z") });
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 1 && doc.getPageCount() <= 4);
  assert.equal(doc.getTitle(), "TASTY TOWN sales report 2026-11-01 to 2026-11-30");
  assert.ok(bytes.length > 20_000, "fonts embedded");
});
test("PDF renders an empty period without crashing", async () => {
  const empty: Report = { summary: { requests: 0, pending: 0, received: 0, confirmed: 0, completed: 0, cancelled: 0, confirmed_revenue: 0, recognised_revenue: 0, discounts: 0, delivery_fees: 0 }, daily: [], hourly: [], by_type: [], top_products: [], categories: [] };
  const bytes = await renderReportPdf(empty, { restaurant: "TASTY TOWN", tagline: "", from: "2026-11-01", to: "2026-11-01", generatedAt: new Date() });
  assert.ok((await PDFDocument.load(bytes)).getPageCount() >= 1);
});
