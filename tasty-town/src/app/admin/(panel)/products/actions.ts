"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, dbError, flag, guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { parseRupees, slugify } from "@/lib/money";

const FOOD = ["veg", "non_veg", "egg"];
const refresh = () => revalidatePath("/", "layout");

type ChildRow = { id: string | null; name: string; amount: number };
function readRows(fd: FormData, prefix: string): ChildRow[] | string {
  const ids = fd.getAll(`${prefix}_id`).map(String), names = fd.getAll(`${prefix}_name`).map((v) => String(v).trim()), prices = fd.getAll(`${prefix}_price`).map((v) => String(v).trim());
  const out: ChildRow[] = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i] && !prices[i]) continue;
    const amount = parseRupees(prices[i] || "0");
    if (!names[i]) return "Every option and add-on needs a name.";
    if (amount === null) return `Enter a valid price for "${names[i]}".`;
    out.push({ id: isUuid(ids[i] ?? "") ? ids[i] : null, name: names[i], amount });
  }
  return out;
}

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), name = str(fd, "name"), price = parseRupees(str(fd, "price"));
  const slug = slugify(str(fd, "slug") || name), food = str(fd, "food_type"), cat = str(fd, "category_id");
  if (name.length < 2 || name.length > 80) return { error: "Enter a product name (2–80 characters)." };
  if (price === null) return { error: "Enter a valid price in rupees, like 80 or 79.50." };
  if (!slug) return { error: "Enter a web address (slug) using letters and numbers." };
  if (!FOOD.includes(food)) return { error: "Choose vegetarian, non-vegetarian or egg." };
  const variants = readRows(fd, "variant"); if (typeof variants === "string") return { error: variants };
  const addons = readRows(fd, "addon"); if (typeof addons === "string") return { error: addons };

  const row = { name, slug, description: str(fd, "description").slice(0, 600) || null, price_paise: price, food_type: food, category_id: isUuid(cat) ? cat : null,
    is_available: flag(fd, "is_available"), is_featured: flag(fd, "is_featured"), is_bestseller: flag(fd, "is_bestseller") };
  let pid = id;
  if (isUuid(id)) {
    const { error } = await a.db.from("products").update(row).eq("id", id);
    if (error) return dbError(error, "Couldn't save the product.");
  } else {
    const { data, error } = await a.db.from("products").insert(row).select("id").single();
    if (error) return dbError(error, "Couldn't create the product.");
    pid = data.id;
  }

  const groups: [string, ChildRow[], (r: ChildRow, i: number) => Record<string, unknown>][] = [
    ["product_variants", variants, (r: ChildRow, i: number) => ({ product_id: pid, name: r.name, price_delta_paise: r.amount, is_default: i === 0, display_order: i })],
    ["product_addons", addons, (r: ChildRow, i: number) => ({ product_id: pid, name: r.name, price_paise: r.amount, display_order: i })],
  ];
  for (const [table, rows, mk] of groups) {
    const keep = rows.filter((r) => r.id).map((r) => r.id!);
    const del = a.db.from(table).delete().eq("product_id", pid);
    const { error: de } = await (keep.length ? del.not("id", "in", `(${keep.join(",")})`) : del);
    if (de) return dbError(de, "Saved, but couldn't update options.");
    for (const [i, r] of rows.entries()) {
      const { error } = r.id ? await a.db.from(table).update(mk(r, i)).eq("id", r.id) : await a.db.from(table).insert(mk(r, i));
      if (error) return dbError(error, "Saved, but couldn't update options.");
    }
  }
  await audit(a, isUuid(id) ? "product.update" : "product.create", "product", pid, { name });
  refresh();
  if (!isUuid(id)) redirect(`/admin/products/${pid}`);
  return { ok: "Saved." };
}

export async function toggleProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), field = str(fd, "field");
  if (!isUuid(id) || !["is_available", "is_featured", "is_bestseller"].includes(field)) return { error: "Invalid request." };
  const { error } = await a.db.from("products").update({ [field]: str(fd, "value") === "true" }).eq("id", id);
  if (error) return dbError(error, "Couldn't update the product.");
  await audit(a, "product.toggle", "product", id, { field, value: str(fd, "value") });
  refresh(); return undefined;
}

export async function archiveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const archive = str(fd, "archive") === "true";
  const { error } = await a.db.from("products").update(archive ? { is_archived: true, is_available: false } : { is_archived: false }).eq("id", id);
  if (error) return dbError(error, "Couldn't update the product.");
  await audit(a, archive ? "product.archive" : "product.restore", "product", id);
  refresh(); return undefined;
}

export async function duplicateProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { data: p } = await a.db.from("products").select("*,product_variants(*),product_addons(*)").eq("id", id).maybeSingle();
  if (!p) return { error: "Product not found." };
  const suffix = Math.random().toString(36).slice(2, 6);
  const { data: n, error } = await a.db.from("products").insert({ category_id: p.category_id, name: `${p.name} (Copy)`, slug: `${p.slug}-copy-${suffix}`, description: p.description,
    price_paise: p.price_paise, food_type: p.food_type, is_available: false, is_featured: false, is_bestseller: false, display_order: p.display_order + 1 }).select("id").single();
  if (error) return dbError(error, "Couldn't duplicate the product.");
  if (p.product_variants.length) await a.db.from("product_variants").insert(p.product_variants.map(({ id: _i, product_id: _p, ...v }: Record<string, unknown>) => ({ ...v, product_id: n.id })));
  if (p.product_addons.length) await a.db.from("product_addons").insert(p.product_addons.map(({ id: _i, product_id: _p, ...v }: Record<string, unknown>) => ({ ...v, product_id: n.id })));
  await audit(a, "product.duplicate", "product", n.id, { from: id });
  refresh(); redirect(`/admin/products/${n.id}`);
}

export async function deleteProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { data: imgs } = await a.db.from("product_images").select("variants").eq("product_id", id);
  const paths = (imgs ?? []).flatMap((i) => Object.values(i.variants as Record<string, string>));
  if (paths.length) { const { error } = await a.db.storage.from("product-images").remove(paths); if (error) return { error: "Couldn't delete the product's photos, so nothing was deleted." }; }
  const { error } = await a.db.from("products").delete().eq("id", id); // order history keeps its own name/price snapshot
  if (error) return dbError(error, "Couldn't delete the product.");
  await audit(a, "product.delete", "product", id);
  refresh(); redirect("/admin/products");
}

export async function moveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), dir = str(fd, "dir"); if (!isUuid(id) || !["up", "down"].includes(dir)) return { error: "Invalid request." };
  const { data: p } = await a.db.from("products").select("category_id").eq("id", id).maybeSingle(); if (!p) return { error: "Product not found." };
  const q = a.db.from("products").select("id").eq("is_archived", false).order("display_order").order("name");
  const { data: list } = await (p.category_id ? q.eq("category_id", p.category_id) : q.is("category_id", null));
  const ids = (list ?? []).map((x) => x.id), i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return undefined;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const res = await Promise.all(ids.map((x, n) => a.db.from("products").update({ display_order: n }).eq("id", x)));
  if (res.some((r) => r.error)) return { error: "Couldn't reorder." };
  refresh(); return undefined;
}
