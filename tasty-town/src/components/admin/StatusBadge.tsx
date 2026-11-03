import { STATUS_LABEL, type OrderStatus } from "@/lib/orders";

const TONE: Record<string, string> = {
  pending_whatsapp: "bg-[#fff1d6] text-[#8a5a00]", received: "bg-[#e8eefc] text-[#274690]", confirmed: "bg-lime text-ink", preparing: "bg-lime text-ink",
  ready: "bg-lime text-ink", out_for_delivery: "bg-lime text-ink", completed: "bg-ink text-white", cancelled: "bg-[#fde4e0] text-[#a02312]",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status] ?? ""}`}>{STATUS_LABEL[status as OrderStatus] ?? status}</span>;
}
