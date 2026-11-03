import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase";
import { quoteOrder } from "@/lib/order-quote";
import { quoteSchema } from "@/lib/order-schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  const db = publicClient();
  if (!db) return NextResponse.json({ error: "The menu is temporarily unavailable." }, { status: 503 });
  try {
    const { offerRule: _omit, ...quote } = await quoteOrder(db, parsed.data);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[quote]", e);
    return NextResponse.json({ error: "Couldn't price your cart. Please try again." }, { status: 500 });
  }
}
