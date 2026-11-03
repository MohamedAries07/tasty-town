import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, hasRole } from "@/lib/auth";
import { ImageError, processImage, type ImageTarget } from "@/lib/images/process";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET: Record<Exclude<ImageTarget, "review">, string> = { product: "product-images", banner: "promotional-banners", category: "category-images", asset: "restaurant-assets" };
const PURPOSES = ["hero_image", "logo", "og_image"];
const RATE_LIMIT_PER_MINUTE = 30;
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("You don't have permission to upload images.", 403);
  const { db, user } = admin;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const target = form?.get("target") as Exclude<ImageTarget, "review"> | null;
  const entityId = form?.get("entityId");
  if (!(file instanceof File) || !target || !(target in BUCKET)) return fail("Invalid upload request.", 400);
  const purpose = String(form?.get("purpose") ?? "");
  if (target === "asset" && (!PURPOSES.includes(purpose) || !hasRole(admin.role, "super_admin"))) return fail("Only the owner can change site images.", 403);
  if (target !== "banner" && target !== "asset" && !isUuid(entityId)) return fail("Choose where this image belongs first.", 400);

  // Rate limit: uploads by this user in the last minute.
  const since = new Date(Date.now() - 60_000).toISOString();
  const [a, b] = await Promise.all([
    db.from("product_images").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id).gte("created_at", since),
    db.from("media_assets").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id).gte("created_at", since),
  ]);
  if ((a.count ?? 0) + (b.count ?? 0) >= RATE_LIMIT_PER_MINUTE) return fail("Too many uploads. Wait a minute and try again.", 429);

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()), target);
  } catch (e) {
    if (e instanceof ImageError) return fail(e.message, 422);
    console.error("[image-process]", e);
    return fail("Image processing failed. Try a different photo.", 500);
  }

  const bucket = BUCKET[target];
  const imageId = crypto.randomUUID();
  const folder = target === "banner" ? imageId : target === "asset" ? `${purpose}/${imageId}` : `${entityId}/${imageId}`;
  const uploaded: string[] = [];
  const paths: Record<string, string> = {};
  const cleanup = async () => { if (uploaded.length) await db.storage.from(bucket).remove(uploaded); };

  try {
    for (const v of processed.variants) {
      const path = `${folder}/${v.name}.${v.ext}`;
      const { error } = await db.storage.from(bucket).upload(path, v.buffer, {
        contentType: v.ext === "avif" ? "image/avif" : "image/webp", cacheControl: "31536000", upsert: false,
      });
      if (error) throw error;
      uploaded.push(path);
      paths[v.name] = path;
    }
    // Verify every variant exists before any database row refers to it.
    for (const path of uploaded) {
      const { data: ok, error } = await db.storage.from(bucket).exists(path);
      if (error || !ok) throw new Error(`Upload verification failed for ${path}`);
    }

    const main = processed.variants[0];
    const common = {
      variants: paths, image_format: main.ext, width: main.width, height: main.height, file_size_bytes: main.size,
      total_bytes: processed.totalBytes, original_size_bytes: processed.originalBytes, uploaded_by: user.id,
    };

    if (target === "product") {
      const { data: existing, error: e1 } = await db.from("product_images").select("display_order").eq("product_id", entityId as string).order("display_order", { ascending: false });
      if (e1) throw e1;
      const { error } = await db.from("product_images").insert({
        id: imageId, product_id: entityId, storage_path: paths.detail, is_primary: (existing?.length ?? 0) === 0,
        display_order: (existing?.[0]?.display_order ?? -1) + 1, ...common,
      });
      if (error) throw error;
    } else {
      const { error } = await db.from("media_assets").insert({ id: imageId, bucket, entity: target, entity_id: isUuid(entityId) ? entityId : null, ...common });
      if (error) throw error;
      if (target === "asset") {
        const { error: se } = await db.from("store_settings").upsert({ key: `${purpose}_path`, value: paths.banner, is_public: true }, { onConflict: "key" });
        if (se) throw se;
      } else if (target === "banner") {
        const title = String(form?.get("title") ?? "").trim().slice(0, 120) || null;
        const { error: be } = await db.from("banners").insert({ title, image_path: paths.banner });
        if (be) throw be;
      } else {
        const { error: ce } = await db.from("categories").update({ image_path: paths.card }).eq("id", entityId as string);
        if (ce) throw ce;
      }
    }
    await db.from("audit_logs").insert({ actor_id: user.id, action: "image.upload", entity: target, entity_id: imageId });
  } catch (e) {
    console.error("[image-upload]", e);
    await cleanup();
    return fail("Upload failed and was rolled back. Please try again.", 500);
  }

  return NextResponse.json({
    id: imageId, format: processed.format, originalBytes: processed.originalBytes, optimizedBytes: processed.totalBytes,
    compressionRatio: Number((processed.originalBytes / processed.totalBytes).toFixed(2)),
  });
}

/** Delete one image: removes storage objects first, then the row. */
export async function DELETE(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("You don't have permission to delete images.", 403);
  const { db, user } = admin;
  const body = await req.json().catch(() => null) as { kind?: string; id?: string } | null;
  if (!body || !isUuid(body.id) || (body.kind !== "product" && body.kind !== "asset")) return fail("Invalid request.", 400);

  if (body.kind === "product") {
    const { data: img } = await db.from("product_images").select("id,product_id,is_primary,variants").eq("id", body.id).maybeSingle();
    if (!img) return fail("Image not found.", 404);
    const { error: re } = await db.storage.from("product-images").remove(Object.values(img.variants as Record<string, string>));
    if (re) return fail("Couldn't delete the stored files. Nothing was removed from the database.", 500);
    const { error } = await db.from("product_images").delete().eq("id", img.id);
    if (error) return fail("Couldn't delete the image record.", 500);
    if (img.is_primary) {
      const { data: next } = await db.from("product_images").select("id").eq("product_id", img.product_id).order("display_order").limit(1);
      if (next?.[0]) await db.from("product_images").update({ is_primary: true }).eq("id", next[0].id);
    }
  } else {
    const { data: asset } = await db.from("media_assets").select("id,bucket,entity,entity_id,variants").eq("id", body.id).maybeSingle();
    if (!asset) return fail("Image not found.", 404);
    const v = asset.variants as Record<string, string>;
    const { error: re } = await db.storage.from(asset.bucket).remove(Object.values(v));
    if (re) return fail("Couldn't delete the stored files. Nothing was removed from the database.", 500);
    await db.from("media_assets").delete().eq("id", asset.id);
    if (asset.entity === "banner") await db.from("banners").delete().eq("image_path", v.banner);
    if (asset.entity === "asset") {
      const { data: cur } = await db.from("store_settings").select("key,value").like("key", "%_path");
      for (const r of cur ?? []) if (r.value === v.banner) await db.from("store_settings").update({ value: "" }).eq("key", r.key);
    }
    if (asset.entity === "category" && asset.entity_id) await db.from("categories").update({ image_path: null }).eq("id", asset.entity_id).eq("image_path", v.card);
  }
  await db.from("audit_logs").insert({ actor_id: user.id, action: "image.delete", entity: body.kind, entity_id: body.id });
  return NextResponse.json({ ok: true });
}

/** Set primary or reorder within a product's gallery. */
export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!hasRole(admin.role, "manager")) return fail("You don't have permission to edit images.", 403);
  const { db } = admin;
  const body = await req.json().catch(() => null) as { id?: string; action?: string } | null;
  if (!body || !isUuid(body.id) || !["primary", "up", "down"].includes(body.action ?? "")) return fail("Invalid request.", 400);

  const { data: img } = await db.from("product_images").select("id,product_id").eq("id", body.id).maybeSingle();
  if (!img) return fail("Image not found.", 404);
  const { data: all } = await db.from("product_images").select("id,display_order").eq("product_id", img.product_id).order("display_order").order("created_at");
  const list = all ?? [];

  if (body.action === "primary") {
    await db.from("product_images").update({ is_primary: false }).eq("product_id", img.product_id);
    const { error } = await db.from("product_images").update({ is_primary: true }).eq("id", img.id);
    if (error) return fail("Couldn't set the primary image.", 500);
  } else {
    const i = list.findIndex((x) => x.id === img.id);
    const j = body.action === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return NextResponse.json({ ok: true });
    [list[i], list[j]] = [list[j], list[i]];
    const results = await Promise.all(list.map((x, n) => db.from("product_images").update({ display_order: n }).eq("id", x.id)));
    if (results.some((r) => r.error)) return fail("Couldn't reorder images.", 500);
  }
  return NextResponse.json({ ok: true });
}
