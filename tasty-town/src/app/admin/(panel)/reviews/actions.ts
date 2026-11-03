"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, dbError, flag, guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";

const refresh = () => { revalidatePath("/", "layout"); revalidatePath("/admin/reviews"); };

async function removeImages(a: NonNullable<Awaited<ReturnType<typeof guard>>>, id: string) {
  const { data } = await a.db.from("reviews").select("image_paths").eq("id", id).maybeSingle();
  const paths = data?.image_paths ?? [];
  if (paths.length) { const { error } = await a.db.storage.from("review-images").remove(paths); if (error) return false; }
  return true;
}

export async function setReviewStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), status = str(fd, "status");
  if (!isUuid(id) || !["published", "pending", "rejected"].includes(status)) return { error: "Invalid request." };
  const patch: Record<string, unknown> = { status };
  if (status === "rejected") { // rejected customer photos are not kept
    if (!(await removeImages(a, id))) return { error: "Couldn't remove the photos, so the review was not rejected." };
    patch.image_paths = []; patch.is_featured = false;
  }
  if (status !== "published") patch.is_featured = false;
  const { error } = await a.db.from("reviews").update(patch).eq("id", id);
  if (error) return dbError(error, "Couldn't update the review.");
  await audit(a, `review.${status}`, "review", id); refresh(); return undefined;
}

export async function toggleFeatured(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { error } = await a.db.from("reviews").update({ is_featured: str(fd, "value") === "true" }).eq("id", id).eq("status", "published");
  if (error) return dbError(error, "Couldn't update the review.");
  await audit(a, "review.feature", "review", id); refresh(); return undefined;
}

export async function saveReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), name = str(fd, "customer_name"), rating = Number(str(fd, "rating")), text = str(fd, "review_text"), prod = str(fd, "product_id"), status = str(fd, "status");
  if (name.length < 2 || name.length > 60) return { error: "Enter the reviewer's name." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5." };
  if (text.length < 5 || text.length > 800) return { error: "Enter the review text (5–800 characters)." };
  if (!["published", "pending"].includes(status)) return { error: "Choose a status." };
  const row = { customer_name: name, rating, review_title: str(fd, "review_title").slice(0, 80) || null, review_text: text, product_id: isUuid(prod) ? prod : null, status, is_featured: status === "published" && flag(fd, "is_featured") };
  if (isUuid(id)) {
    const { error } = await a.db.from("reviews").update(row).eq("id", id);
    if (error) return dbError(error, "Couldn't save the review.");
    await audit(a, "review.update", "review", id); refresh(); return { ok: "Saved." };
  }
  const { data, error } = await a.db.from("reviews").insert({ ...row, is_verified: false, admin_created: true }).select("id").single();
  if (error) return dbError(error, "Couldn't add the review.");
  await audit(a, "review.create", "review", data.id); refresh(); redirect(`/admin/reviews/${data.id}`);
}

export async function deleteReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  if (!(await removeImages(a, id))) return { error: "Couldn't remove the photos, so nothing was deleted." };
  const { error } = await a.db.from("reviews").delete().eq("id", id);
  if (error) return dbError(error, "Couldn't delete the review.");
  await audit(a, "review.delete", "review", id); refresh(); redirect("/admin/reviews");
}
