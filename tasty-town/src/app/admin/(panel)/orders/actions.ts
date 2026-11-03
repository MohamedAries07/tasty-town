"use server";
import { revalidatePath } from "next/cache";
import { guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { STATUSES } from "@/lib/orders";

const MESSAGES: Record<string, string> = {
  not_allowed: "You don't have permission to do that.", not_found: "Order not found.",
  bad_transition: "That status change isn't allowed from the order's current status.",
};
const explain = (m: string) => Object.entries(MESSAGES).find(([k]) => m.includes(k))?.[1] ?? "Couldn't update the order.";

export async function setOrderStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("staff"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), status = str(fd, "status");
  if (!isUuid(id) || !(STATUSES as string[]).includes(status)) return { error: "Invalid request." };
  const { error } = await a.db.rpc("admin_set_order_status", { p_order: id, p_status: status, p_note: str(fd, "note") || null });
  if (error) { console.error("[order-status]", error); return { error: explain(error.message) }; }
  revalidatePath("/admin", "layout"); return { ok: "Status updated." };
}

export async function saveOrderDetails(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("staff"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), pay = str(fd, "payment_status");
  if (!isUuid(id) || !["unpaid", "paid", "refunded"].includes(pay)) return { error: "Invalid request." };
  const { error } = await a.db.rpc("admin_update_order", { p_order: id, p_notes: str(fd, "internal_notes"), p_payment: pay });
  if (error) { console.error("[order-update]", error); return { error: explain(error.message) }; }
  revalidatePath("/admin", "layout"); return { ok: "Saved." };
}
