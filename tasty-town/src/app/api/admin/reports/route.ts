import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, hasRole } from "@/lib/auth";
import { isDate, istRange } from "@/lib/dates";
import { daysBetween, dailyCsv, fillDays, MAX_RANGE_DAYS, productsCsv, rupees, summaryCsv, toCsv, type Report } from "@/lib/report";
import { renderReportPdf } from "@/lib/report-pdf";
import { getSettings, str } from "@/lib/queries";

export const runtime = "nodejs";
export const maxDuration = 60;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const KINDS = ["summary", "daily", "products", "orders"];

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("Reports need manager access.", 403);
  const sp = req.nextUrl.searchParams, from = sp.get("from") ?? "", to = sp.get("to") ?? "", format = sp.get("format") ?? "pdf", kind = sp.get("kind") ?? "summary";
  if (!isDate(from) || !isDate(to) || to < from) return fail("Choose a valid date range.", 400);
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return fail(`Choose a range of ${MAX_RANGE_DAYS} days or less.`, 400);
  if (format !== "pdf" && format !== "csv") return fail("Unknown format.", 400);
  if (format === "csv" && !KINDS.includes(kind)) return fail("Unknown export.", 400);

  const { db, user } = admin, { startISO, endISO } = istRange(from, to);
  const name = `tasty-town-${format === "pdf" ? "report" : kind}-${from}_${to}.${format}`;
  const send = (body: BodyInit, type: string) => new NextResponse(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });

  try {
    let response: NextResponse;
    if (format === "csv" && kind === "orders") {
      const rows: (string | number)[][] = [["Order", "Placed (IST)", "Customer", "Phone", "Type", "Status", "Payment", "Payment status", "Subtotal (INR)", "Discount (INR)", "Delivery fee (INR)", "Total (INR)"]];
      const stamp = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "Asia/Kolkata" });
      for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await db.from("orders").select("reference,created_at,customer_name,customer_phone,order_type,status,payment_method,payment_status,subtotal_paise,discount_paise,delivery_fee_paise,total_paise")
          .gte("created_at", startISO).lt("created_at", endISO).order("created_at").range(offset, offset + 999);
        if (error) throw error;
        for (const o of data) rows.push([o.reference, stamp.format(new Date(o.created_at)), o.customer_name, o.customer_phone, o.order_type, o.status, o.payment_method, o.payment_status, rupees(o.subtotal_paise), rupees(o.discount_paise), rupees(o.delivery_fee_paise), rupees(o.total_paise)]);
        if (data.length < 1000) break;
      }
      response = send(toCsv(rows), "text/csv; charset=utf-8");
    } else {
      const { data, error } = await db.rpc("analytics_report", { p_from: startISO, p_to: endISO });
      if (error || !data) throw error ?? new Error("empty report");
      const report = data as Report;
      if (format === "csv") response = send(kind === "daily" ? dailyCsv(fillDays(from, to, report.daily)) : kind === "products" ? productsCsv(report) : summaryCsv(report, from, to), "text/csv; charset=utf-8");
      else {
        const s = await getSettings();
        const pdf = await renderReportPdf(report, { restaurant: str(s, "restaurant_name", "TASTY TOWN"), tagline: str(s, "tagline"), from, to, generatedAt: new Date() });
        response = send(pdf as unknown as BodyInit, "application/pdf");
      }
    }
    await db.from("audit_logs").insert({ actor_id: user.id, action: "report.export", entity: "report", details: { from, to, format, kind: format === "csv" ? kind : "pdf" } });
    return response;
  } catch (e) {
    console.error("[report]", e);
    return fail("Couldn't generate the report. Please try again.", 500);
  }
}
