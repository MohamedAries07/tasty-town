import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(10).max(80), event: z.enum(["handoff", "sent"]) });

/** Records the customer's side of the WhatsApp flow. "sent" is the customer's own word, not proof of delivery. */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const col = parsed.data.event === "handoff" ? "whatsapp_handoff_at" : "customer_confirmed_sent_at";
  const db = serviceClient();
  const { data: order } = await db.from("orders").select(`id,${col}`).eq("reference", reference).eq("receipt_token", parsed.data.token).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!(order as unknown as Record<string, unknown>)[col]) {
    const { error } = await db.from("orders").update({ [col]: new Date().toISOString() }).eq("id", order.id);
    if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
