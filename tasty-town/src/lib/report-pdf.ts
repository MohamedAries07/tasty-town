import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { averageOrder, cancellationRate, fillDays, fillHours, hourLabel, type Report } from "./report.ts";

const W = 595, H = 842, M = 40;
const INK = rgb(0.063, 0.063, 0.063), LIME = rgb(0.722, 0.961, 0.165), MUTED = rgb(0.451, 0.451, 0.451), LINE = rgb(0.91, 0.91, 0.898), SOFT = rgb(0.98, 0.98, 0.973);

const inr = (p: number) => { const n = p / 100; return "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n); };
const fmtDate = (s: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${s}T00:00:00Z`));
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ");

export type PdfMeta = { restaurant: string; tagline: string; from: string; to: string; generatedAt: Date };

export async function renderReportPdf(r: Report, meta: PdfMeta): Promise<Uint8Array> {
  const dir = path.join(process.cwd(), "src/assets/fonts");
  const [reg, bold] = await Promise.all([readFile(path.join(dir, "Geist-Regular.ttf")), readFile(path.join(dir, "Geist-Bold.ttf"))]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f = await pdf.embedFont(reg, { subset: true }), fb = await pdf.embedFont(bold, { subset: true });
  pdf.setTitle(`${meta.restaurant} sales report ${meta.from} to ${meta.to}`); pdf.setAuthor(meta.restaurant); pdf.setCreationDate(meta.generatedAt);

  let page!: PDFPage, y = 0;
  const fit = (s: string, font: PDFFont, size: number, max: number) => { s = clean(s); if (font.widthOfTextAtSize(s, size) <= max) return s; while (s.length > 1 && font.widthOfTextAtSize(s + "...", size) > max) s = s.slice(0, -1); return s + "..."; };
  const text = (s: string, x: number, yy: number, size = 10, font = f, color = INK, align: "l" | "r" = "l") => {
    s = clean(s); const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: align === "r" ? x - w : x, y: yy, size, font, color });
  };
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; if (pdf.getPageCount() > 1) { text(`${meta.restaurant} · Sales report`, M, y - 4, 9, fb, MUTED); y -= 28; } };
  const ensure = (h: number) => { if (y - h < M + 24) newPage(); };
  const heading = (s: string) => { ensure(60); y -= 14; text(s, M, y, 13, fb); y -= 8; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.75, color: LINE }); y -= 16; };

  const table = (head: string[], rows: string[][], widths: number[]) => {
    const draw = (cells: string[], font: PDFFont, color = INK) => {
      let x = M; cells.forEach((c, i) => { const w = widths[i]; if (i === 0) text(fit(c, font, 9.5, w - 8), x + 4, y, 9.5, font, color); else text(fit(c, font, 9.5, w - 8), x + w - 4, y, 9.5, font, color, "r"); x += w; });
    };
    ensure(40); page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: SOFT }); draw(head, fb, MUTED); y -= 20;
    if (!rows.length) { text("No data for this period.", M + 4, y, 9.5, f, MUTED); y -= 18; return; }
    for (const row of rows) { ensure(20); draw(row, f); page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.4, color: LINE }); y -= 18; }
  };

  const bars = (title: string, values: number[], labels: string[], fmt: (n: number) => string) => {
    const h = 110; ensure(h + 50); text(title, M, y, 10, fb); y -= 8;
    const max = Math.max(...values, 0), base = y - h, cw = W - 2 * M, bw = cw / values.length;
    page.drawLine({ start: { x: M, y: base }, end: { x: W - M, y: base }, thickness: 0.75, color: LINE });
    if (max > 0) values.forEach((v, i) => { const bh = Math.max(v > 0 ? 1 : 0, (v / max) * (h - 14)); page.drawRectangle({ x: M + i * bw + bw * 0.15, y: base, width: bw * 0.7, height: bh, color: INK }); });
    text(`Peak ${fmt(max)}`, W - M, y - 8, 8, f, MUTED, "r");
    const step = Math.ceil(values.length / 8);
    labels.forEach((l, i) => { if (i % step === 0 || (i === labels.length - 1 && i % step >= Math.ceil(step / 2))) text(l, M + i * bw + bw / 2 - f.widthOfTextAtSize(l, 7.5) / 2, base - 12, 7.5, f, MUTED); });
    y = base - 30;
  };

  // Header band
  newPage();
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: INK }); page.drawRectangle({ x: M, y: H - 112, width: 56, height: 4, color: LIME });
  text(meta.restaurant, M, H - 52, 24, fb, rgb(1, 1, 1)); text(meta.tagline, M, H - 72, 10, f, LIME);
  text("Sales report", W - M, H - 52, 14, fb, rgb(1, 1, 1), "r");
  text(meta.from === meta.to ? fmtDate(meta.from) : `${fmtDate(meta.from)} – ${fmtDate(meta.to)}`, W - M, H - 72, 10, f, rgb(1, 1, 1), "r");
  y = H - 140;

  const s = r.summary;
  heading("Summary");
  const cards: [string, string][] = [["Order requests", String(s.requests)], ["Confirmed orders", String(s.confirmed)], ["Completed orders", String(s.completed)], ["Cancelled orders", String(s.cancelled)],
    ["Confirmed revenue", inr(s.confirmed_revenue)], ["Average confirmed order", inr(averageOrder(s))]];
  const cwd = (W - 2 * M - 16) / 3;
  cards.forEach(([l, v], i) => { const cx = M + (i % 3) * (cwd + 8), cy = y - Math.floor(i / 3) * 58;
    page.drawRectangle({ x: cx, y: cy - 44, width: cwd, height: 50, color: SOFT, borderColor: LINE, borderWidth: 0.5 }); text(l, cx + 10, cy - 12, 8.5, f, MUTED); text(v, cx + 10, cy - 32, 15, fb); });
  y -= 120;

  heading("Revenue details");
  table(["Measure", "Amount"], [["Confirmed revenue (confirmed through completed)", inr(s.confirmed_revenue)], ["Recognised revenue (completed and paid)", inr(s.recognised_revenue)],
    ["Discounts given on confirmed orders", inr(s.discounts)], ["Delivery fees on confirmed orders", inr(s.delivery_fees)], ["Average confirmed order", inr(averageOrder(s))]], [W - 2 * M - 120, 120]);

  heading("Order statistics");
  const rate = cancellationRate(s);
  table(["Status", "Orders"], [["Order requests (all placed)", String(s.requests)], ["Pending WhatsApp confirmation", String(s.pending)], ["Received", String(s.received)],
    ["Confirmed (confirmed through completed)", String(s.confirmed)], ["Completed", String(s.completed)], ["Cancelled", String(s.cancelled)], ["Cancellation rate", rate === null ? "—" : `${rate}%`]], [W - 2 * M - 120, 120]);

  ensure(290); heading("Charts");
  const days = fillDays(meta.from, meta.to, r.daily), hours = fillHours(r.hourly);
  bars("Confirmed revenue per day", days.map((d) => d.confirmed_revenue), days.map((d) => d.d.slice(5)), inr);
  bars("Order requests per hour (India time)", hours.map((x) => x.requests), hours.map((x) => hourLabel(x.h)), (n) => String(n));

  heading("Delivery versus takeaway");
  const label = (t: string) => (t === "delivery" ? "Home delivery" : "Takeaway");
  table(["Type", "Requests", "Confirmed", "Confirmed revenue"], r.by_type.map((t) => [label(t.order_type), String(t.requests), String(t.confirmed), inr(t.confirmed_revenue)]), [W - 2 * M - 270, 80, 90, 100]);

  heading("Top-selling products (confirmed orders)");
  table(["Product", "Qty", "Revenue"], r.top_products.map((p) => [p.name, String(p.quantity), inr(p.revenue)]), [W - 2 * M - 160, 60, 100]);
  heading("Category performance (confirmed orders)");
  table(["Category", "Qty", "Revenue"], r.categories.map((p) => [p.name, String(p.quantity), inr(p.revenue)]), [W - 2 * M - 160, 60, 100]);

  ensure(50); y -= 6;
  text("Pending, received and cancelled orders are never counted as revenue. All dates and hours are India time.", M, y, 8, f, MUTED);

  const stamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(meta.generatedAt);
  const n = pdf.getPageCount();
  pdf.getPages().forEach((p, i) => { page = p; text(`Generated ${stamp} IST`, M, 24, 8, f, MUTED); text(`Page ${i + 1} of ${n}`, W - M, 24, 8, f, MUTED, "r"); });
  return pdf.save();
}
