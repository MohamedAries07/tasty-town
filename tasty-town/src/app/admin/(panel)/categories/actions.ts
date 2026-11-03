"use server";
import { revalidatePath } from "next/cache";
import { audit, dbError, flag, guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { slugify } from "@/lib/money";

const refresh = () => revalidatePath("/", "layout");

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), name = str(fd, "name"), slug = slugify(str(fd, "slug") || name), parent = str(fd, "parent_id");
  if (name.length < 2 || name.length > 60) return { error: "Enter a category name (2–60 characters)." };
  if (!slug) return { error: "Enter a web address using letters and numbers." };
  if (isUuid(id) && parent === id) return { error: "A category can't be its own parent." };
  const row = { name, slug, parent_id: isUuid(parent) ? parent : null, is_visible: flag(fd, "is_visible") };
  if (isUuid(id)) {
    const { error } = await a.db.from("categories").update(row).eq("id", id);
    if (error) return dbError(error, "Couldn't save the category.");
  } else {
    const { data: last } = await a.db.from("categories").select("display_order").order("display_order", { ascending: false }).limit(1);
    const { error } = await a.db.from("categories").insert({ ...row, display_order: (last?.[0]?.display_order ?? 0) + 1 });
    if (error) return dbError(error, "Couldn't create the category.");
  }
  await audit(a, isUuid(id) ? "category.update" : "category.create", "category", isUuid(id) ? id : undefined, { name });
  refresh(); return { ok: isUuid(id) ? "Saved." : "Category added." };
}

export async function deleteCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { data: assets } = await a.db.from("media_assets").select("id,variants").eq("entity", "category").eq("entity_id", id);
  const paths = (assets ?? []).flatMap((x) => Object.values(x.variants as Record<string, string>));
  if (paths.length) { const { error } = await a.db.storage.from("category-images").remove(paths); if (error) return { error: "Couldn't remove the category's images, so nothing was deleted." }; }
  const { error } = await a.db.from("categories").delete().eq("id", id); // products stay, just uncategorised
  if (error) return dbError(error, "Couldn't delete the category.");
  await audit(a, "category.delete", "category", id);
  refresh(); return undefined;
}

export async function moveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), dir = str(fd, "dir"); if (!isUuid(id) || !["up", "down"].includes(dir)) return { error: "Invalid request." };
  const { data } = await a.db.from("categories").select("id").order("display_order").order("name");
  const ids = (data ?? []).map((x) => x.id), i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return undefined;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const res = await Promise.all(ids.map((x, n) => a.db.from("categories").update({ display_order: n }).eq("id", x)));
  if (res.some((r) => r.error)) return { error: "Couldn't reorder." };
  refresh(); return undefined;
}
