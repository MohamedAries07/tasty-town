export const CONFIRMED_STATUSES = ["confirmed", "preparing", "ready", "out_for_delivery", "completed"];
export type OrderRow = { status: string; total_paise: number; payment_status: string };

/**
 * Definitions (shown in the admin UI):
 * - requests: every order placed in the period, including pending and cancelled.
 * - confirmed: restaurant confirmed it (confirmed .. completed). Pending, received and cancelled are NOT confirmed.
 * - confirmedRevenue: value of confirmed orders. recognisedRevenue: completed AND marked paid.
 */
export function summarizeOrders(rows: OrderRow[]) {
  const n = (f: (r: OrderRow) => boolean) => rows.filter(f).length;
  const confirmedRows = rows.filter((r) => CONFIRMED_STATUSES.includes(r.status));
  const confirmedRevenue = confirmedRows.reduce((a, r) => a + r.total_paise, 0);
  return {
    requests: rows.length,
    pending: n((r) => r.status === "pending_whatsapp"),
    received: n((r) => r.status === "received"),
    confirmed: confirmedRows.length,
    completed: n((r) => r.status === "completed"),
    cancelled: n((r) => r.status === "cancelled"),
    confirmedRevenue,
    recognisedRevenue: rows.filter((r) => r.status === "completed" && r.payment_status === "paid").reduce((a, r) => a + r.total_paise, 0),
    averageOrderPaise: confirmedRows.length ? Math.round(confirmedRevenue / confirmedRows.length) : 0,
  };
}

export function topProducts(items: { product_name: string; quantity: number; line_total_paise: number }[], limit = 5) {
  const m = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const i of items) {
    const e = m.get(i.product_name) ?? { name: i.product_name, quantity: 0, revenue: 0 };
    e.quantity += i.quantity; e.revenue += i.line_total_paise; m.set(i.product_name, e);
  }
  return [...m.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, limit);
}
