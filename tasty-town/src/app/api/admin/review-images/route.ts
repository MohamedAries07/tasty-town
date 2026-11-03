import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, hasRole } from "@/lib/auth";
import { ImageError, processImage } from "@/lib/images/process";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_PER_REVIEW = 5;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("You don't have permission to do that.", 403);
  const { db, user } = admin;
  const form = await req.formData().catch(() => null);
  const reviewId = form?.get("reviewId"), file = form?.get("file");
  if (!isUuid(reviewId) || !(file instanceof File)) return fail("Invalid request.", 400);
  const { data: r } = await db.from("reviews").select("image_paths").eq("id", reviewId).maybeSingle();
  if (!r) return fail("Review not found.", 404);
  if (r.image_paths.length >= MAX_PER_REVIEW) return fail(`A review can have up to ${MAX_PER_REVIEW} photos.`, 409);

  let out;
  try { out = await processImage(Buffer.from(await file.arrayBuffer()), "review"); }
  catch (e) { return e instanceof ImageError ? fail(e.message, 422) : fail("Image processing failed.", 500); }
  const path = `${reviewId}/${crypto.randomUUID()}/photo.webp`;
  const { error } = await db.storage.from("review-images").upload(path, out.variants[0].buffer, { contentType: "image/webp", upsert: false });
  if (error) { console.error("[review-image]", error); return fail("Upload failed.", 500); }
  const { error: ue } = await db.from("reviews").update({ image_paths: [...r.image_paths, path] }).eq("id", reviewId);
  if (ue) { await db.storage.from("review-images").remove([path]); return fail("Upload failed and was rolled back.", 500); }
  await db.from("audit_logs").insert({ actor_id: user.id, action: "review.image.add", entity: "review", entity_id: reviewId });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("You don't have permission to do that.", 403);
  const { db, user } = admin;
  const body = await req.json().catch(() => null) as { reviewId?: string; path?: string } | null;
  if (!body || !isUuid(body.reviewId) || typeof body.path !== "string") return fail("Invalid request.", 400);
  const { data: r } = await db.from("reviews").select("image_paths").eq("id", body.reviewId).maybeSingle();
  if (!r || !r.image_paths.includes(body.path)) return fail("Photo not found.", 404);
  const { error: re } = await db.storage.from("review-images").remove([body.path]);
  if (re) return fail("Couldn't delete the photo.", 500);
  const { error } = await db.from("reviews").update({ image_paths: r.image_paths.filter((p: string) => p !== body.path) }).eq("id", body.reviewId);
  if (error) return fail("Couldn't update the review.", 500);
  await db.from("audit_logs").insert({ actor_id: user.id, action: "review.image.remove", entity: "review", entity_id: body.reviewId });
  return NextResponse.json({ ok: true });
}
