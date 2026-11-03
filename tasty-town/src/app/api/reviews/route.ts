import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase-admin";
import { ImageError, processImage } from "@/lib/images/process";
import { isVerifiedEligible } from "@/lib/reviews";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_IMAGES = 3;
const MAX_PER_HOUR = 3;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

const schema = z.object({
  customerName: z.string().trim().min(2, "Enter your name.").max(60),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  title: z.string().trim().max(80).optional(),
  text: z.string().trim().min(10, "Write a few words about your experience.").max(800),
  productId: z.string().uuid().optional(),
  orderRef: z.string().regex(/^[A-Z0-9-]{6,30}$/).optional(),
  token: z.string().regex(/^[0-9a-f]{20,80}$/).optional(),
});

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid submission.", 400);
  if (String(form.get("website") ?? "")) return NextResponse.json({ ok: true }); // honeypot: bots fill hidden fields; pretend success

  const opt = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v || undefined; };
  const parsed = schema.safeParse({ customerName: opt("customerName"), rating: opt("rating"), title: opt("title"), text: opt("text"), productId: opt("productId"), orderRef: opt("orderRef"), token: opt("token") });
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const b = parsed.data;
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) return fail(`You can add up to ${MAX_IMAGES} photos.`, 400);

  let db;
  try { db = serviceClient(); } catch { return fail("Reviews are temporarily unavailable.", 503); }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex").slice(0, 32);
  const { count } = await db.from("reviews").select("id", { count: "exact", head: true }).eq("client_ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= MAX_PER_HOUR) return fail("You've sent a few reviews already. Please try again later.", 429);

  // Verified purchase: only through a real receipt link for a completed order.
  let orderId: string | null = null, verified = false;
  if (b.orderRef || b.token) {
    if (!b.orderRef || !b.token) return fail("That order link isn't valid.", 400);
    const { data: o } = await db.from("orders").select("id,status,order_items(product_id)").eq("reference", b.orderRef).eq("receipt_token", b.token).maybeSingle();
    if (!o) return fail("We couldn't find that order.", 404);
    const inOrder = b.productId ? (o.order_items as { product_id: string | null }[]).some((i) => i.product_id === b.productId) : null;
    if (!isVerifiedEligible(o, inOrder)) return fail(o.status !== "completed" ? "You can review an order once it has been completed." : "That item wasn't part of this order.", 409);
    const dup = await db.from("reviews").select("id", { count: "exact", head: true }).eq("order_id", o.id).filter("product_id", b.productId ? "eq" : "is", b.productId ?? null);
    if ((dup.count ?? 0) > 0) return fail("You've already reviewed this.", 409);
    orderId = o.id; verified = true;
  }

  const id = crypto.randomUUID(), uploaded: string[] = [];
  const cleanup = async () => { if (uploaded.length) await db.storage.from("review-images").remove(uploaded); };
  try {
    for (const f of files) {
      let out;
      try { out = await processImage(Buffer.from(await f.arrayBuffer()), "review"); }
      catch (e) { if (e instanceof ImageError) { await cleanup(); return fail(e.message, 422); } throw e; }
      const path = `${id}/${crypto.randomUUID()}/photo.webp`;
      const { error } = await db.storage.from("review-images").upload(path, out.variants[0].buffer, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      uploaded.push(path);
      const { data: ok } = await db.storage.from("review-images").exists(path);
      if (!ok) throw new Error("upload verification failed");
    }
    const { error } = await db.from("reviews").insert({ id, product_id: b.productId ?? null, order_id: orderId, customer_name: b.customerName, rating: b.rating,
      review_title: b.title ?? null, review_text: b.text, image_paths: uploaded, is_verified: verified, status: "pending", client_ip_hash: ipHash });
    if (error) throw error;
  } catch (e) {
    console.error("[review-submit]", e); await cleanup();
    return fail("We couldn't save your review. Please try again.", 500);
  }
  return NextResponse.json({ ok: true, verified });
}
