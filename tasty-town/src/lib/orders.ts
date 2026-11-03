export type OrderStatus = "pending_whatsapp" | "received" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_whatsapp: "Pending WhatsApp confirmation", received: "Received", confirmed: "Confirmed", preparing: "Preparing",
  ready: "Ready", out_for_delivery: "Out for delivery", completed: "Completed", cancelled: "Cancelled",
};
export const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
const T: Record<OrderStatus, OrderStatus[]> = {
  pending_whatsapp: ["received", "confirmed", "cancelled"], received: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"], ready: ["out_for_delivery", "completed", "cancelled"], out_for_delivery: ["completed", "cancelled"],
  completed: [], cancelled: [],
};
/** Mirrors admin_set_order_status() in the database, which is the enforcing copy. */
export function nextStatuses(status: OrderStatus, type: "delivery" | "takeaway", role: "super_admin" | "manager" | "staff"): OrderStatus[] {
  let n = T[status];
  if (type === "takeaway") n = n.filter((s) => s !== "out_for_delivery");
  if (type === "delivery" && status === "ready") n = n.filter((s) => s !== "completed");
  if (role === "staff") n = n.filter((s) => s !== "cancelled");
  return n;
}
