import { NextResponse } from "next/server";
import { getAdmin, hasRole } from "@/lib/auth";
import { listAll } from "@/lib/images/storage";

export const runtime = "nodejs";
const MIN_AGE_MS = 60 * 60 * 1000; // never touch files newer than 1 hour (uploads may be in flight)
const MANAGED = [
  { bucket: "product-images", table: "product_images" },
  { bucket: "promotional-banners", table: "media_assets" },
  { bucket: "category-images", table: "media_assets" },
] as const;

async function findOrphans(admin: NonNullable<Awaited<ReturnType<typeof getAdmin>>>) {
  const { db } = admin;
  const [pi, ma] = await Promise.all([db.from("product_images").select("variants"), db.from("media_assets").select("bucket,variants")]);
  if (pi.error || ma.error) throw pi.error ?? ma.error;
  const known = new Set<string>();
  for (const r of pi.data) Object.values(r.variants as Record<string, string>).forEach((p) => known.add(`product-images/${p}`));
  for (const r of ma.data) Object.values(r.variants as Record<string, string>).forEach((p) => known.add(`${r.bucket}/${p}`));
  const orphans: { bucket: string; path: string; size: number }[] = [];
  for (const { bucket } of MANAGED) {
    for (const o of await listAll(db, bucket)) {
      const old = o.createdAt ? Date.now() - new Date(o.createdAt).getTime() > MIN_AGE_MS : false;
      if (old && !known.has(`${bucket}/${o.path}`)) orphans.push({ bucket, path: o.path, size: o.size });
    }
  }
  return { admin, orphans };
}

async function authorize() {
  const admin = await getAdmin();
  if (!admin) return { res: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) } as const;
  if (!hasRole(admin.role, "manager")) return { res: NextResponse.json({ error: "Not allowed." }, { status: 403 }) } as const;
  return { admin } as const;
}

export async function GET() {
  const a = await authorize(); if ("res" in a) return a.res;
  try {
    const r = await findOrphans(a.admin);
    return NextResponse.json({ count: r.orphans.length, bytes: r.orphans.reduce((a, o) => a + o.size, 0) });
  } catch (e) {
    console.error("[orphan-scan]", e);
    return NextResponse.json({ error: "Couldn't scan storage." }, { status: 500 });
  }
}

/** Deletes orphans. The list is recomputed on the server; nothing is taken from the client. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { confirm?: boolean } | null;
  if (!body?.confirm) return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  const a = await authorize(); if ("res" in a) return a.res;
  try {
    const r = await findOrphans(a.admin);
    const { db, user } = r.admin;
    for (const { bucket } of MANAGED) {
      const paths = r.orphans.filter((o) => o.bucket === bucket).map((o) => o.path);
      if (paths.length) {
        const { error } = await db.storage.from(bucket).remove(paths);
        if (error) throw error;
      }
    }
    await db.from("audit_logs").insert({ actor_id: user.id, action: "storage.cleanup", entity: "storage", details: { removed: r.orphans.length } });
    return NextResponse.json({ removed: r.orphans.length });
  } catch (e) {
    console.error("[orphan-clean]", e);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
