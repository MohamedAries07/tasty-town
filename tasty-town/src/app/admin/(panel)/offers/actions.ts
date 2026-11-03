"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, dbError, flag, guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { istLocalToISO } from "@/lib/dates";
import { parseRupees } from "@/lib/money";

const refresh = () => revalidatePath("/", "layout");

export async function saveOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), title = str(fd, "title"), type = str(fd, "discount_type"), code = str(fd, "coupon_code").toUpperCase();
  if (title.length < 2 || title.length > 80) return { error: "Enter an offer title." };
  if (!["fixed", "percentage"].includes(type)) return { error: "Choose a discount type." };
  let value: number | null;
  if (type === "percentage") { value = /^\d{1,3}$/.test(str(fd, "discount_value")) ? Number(str(fd, "discount_value")) : null; if (value === null || value < 1 || value > 100) return { error: "Percentage must be a whole number from 1 to 100." }; }
  else { value = parseRupees(str(fd, "discount_value")); if (!value) return { error: "Enter a discount amount in rupees." }; }
  if (code && !/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Coupon codes use 3–30 letters, numbers, - or _." };
  const min = str(fd, "min_order") ? parseRupees(str(fd, "min_order")) : 0; if (min === null) return { error: "Enter a valid minimum order." };
  const max = str(fd, "max_discount") ? parseRupees(str(fd, "max_discount")) : null; if (str(fd, "max_discount") && max === null) return { error: "Enter a valid maximum discount." };
  const starts = str(fd, "starts_at") ? istLocalToISO(str(fd, "starts_at")) : null; if (str(fd, "starts_at") && !starts) return { error: "Enter a valid start date." };
  const ends = str(fd, "ends_at") ? istLocalToISO(str(fd, "ends_at")) : null; if (str(fd, "ends_at") && !ends) return { error: "Enter a valid end date." };
  if (starts && ends && ends <= starts) return { error: "The end date must be after the start date." };
  const limit = str(fd, "usage_limit") ? Number(str(fd, "usage_limit")) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return { error: "Usage limit must be a whole number, 1 or more." };
  const priority = Number(str(fd, "priority") || 0); if (!Number.isInteger(priority) || priority < 0 || priority > 1000) return { error: "Priority must be a whole number from 0 to 1000." };

  const row = { title, description: str(fd, "description").slice(0, 300) || null, coupon_code: code || null, discount_type: type, discount_value: value, min_order_paise: min,
    max_discount_paise: type === "percentage" ? max : null, starts_at: starts, ends_at: ends, is_active: flag(fd, "is_active"), priority, usage_limit: limit };
  let oid = id;
  if (isUuid(id)) { const { error } = await a.db.from("offers").update(row).eq("id", id); if (error) return dbError(error, "Couldn't save the offer."); }
  else { const { data, error } = await a.db.from("offers").insert(row).select("id").single(); if (error) return dbError(error, "Couldn't create the offer."); oid = data.id; }

  const products = fd.getAll("product_ids").map(String).filter(isUuid), cats = fd.getAll("category_ids").map(String).filter(isUuid);
  await a.db.from("offer_products").delete().eq("offer_id", oid); await a.db.from("offer_categories").delete().eq("offer_id", oid);
  if (products.length) { const { error } = await a.db.from("offer_products").insert(products.map((p) => ({ offer_id: oid, product_id: p }))); if (error) return dbError(error, "Saved, but couldn't link products."); }
  if (cats.length) { const { error } = await a.db.from("offer_categories").insert(cats.map((c) => ({ offer_id: oid, category_id: c }))); if (error) return dbError(error, "Saved, but couldn't link categories."); }
  await audit(a, isUuid(id) ? "offer.update" : "offer.create", "offer", oid, { title });
  refresh();
  if (!isUuid(id)) redirect(`/admin/offers/${oid}`);
  return { ok: "Saved." };
}

export async function toggleOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { error } = await a.db.from("offers").update({ is_active: str(fd, "value") === "true" }).eq("id", id);
  if (error) return dbError(error, "Couldn't update the offer.");
  await audit(a, "offer.toggle", "offer", id); refresh(); return undefined;
}

export async function deleteOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("manager"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  const { error } = await a.db.from("offers").delete().eq("id", id); // past orders keep their offer snapshot
  if (error) return dbError(error, "Couldn't delete the offer.");
  await audit(a, "offer.delete", "offer", id); refresh(); redirect("/admin/offers");
}
