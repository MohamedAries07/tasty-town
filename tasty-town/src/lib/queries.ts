import { publicClient } from "./supabase";
import type { Banner, Category, Offer, Product, ProductDetail, Review, Settings } from "@/types";

const PRODUCT_SELECT =
  "id,name,slug,description,price_paise,food_type,is_available,is_featured,is_bestseller," +
  "categories(name,slug),product_images(storage_path,variants,is_primary,display_order,width,height)";

async function safe<T>(fallback: T, run: (db: NonNullable<ReturnType<typeof publicClient>>) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const db = publicClient();
  if (!db) return fallback;
  try {
    const { data, error } = await run(db);
    if (error) { console.error("[queries]", error); return fallback; }
    return (data ?? fallback) as T;
  } catch (e) {
    console.error("[queries]", e);
    return fallback;
  }
}

export async function getSettings(): Promise<Settings> {
  const rows = await safe<{ key: string; value: unknown }[]>([], (db) => db.from("store_settings").select("key,value"));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export const getCategories = () =>
  safe<Category[]>([], (db) => db.from("categories").select("id,name,slug,image_path,display_order").order("display_order"));

export interface ProductFilter { q?: string; type?: string; categoryId?: string; featured?: boolean; bestseller?: boolean; limit?: number }

export async function getProducts(f: ProductFilter = {}): Promise<Product[]> {
  return safe<Product[]>([], (db) => {
    let query = db.from("products").select(PRODUCT_SELECT).order("display_order");
    if (f.q) query = query.ilike("name", `%${f.q.replace(/[%_,]/g, " ")}%`);
    if (f.type === "veg" || f.type === "non_veg" || f.type === "egg") query = query.eq("food_type", f.type);
    if (f.featured) query = query.eq("is_featured", true);
    if (f.bestseller) query = query.eq("is_bestseller", true);
    if (f.categoryId) query = query.eq("category_id", f.categoryId);
    if (f.limit) query = query.limit(f.limit);
    return query;
  });
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const rows = await safe<ProductDetail[]>([], (db) => db.from("products")
    .select(PRODUCT_SELECT + ",product_variants(id,name,price_delta_paise,is_available,is_default,display_order),product_addons(id,name,price_paise,is_available,display_order)")
    .eq("slug", slug).limit(1));
  return rows[0] ?? null;
}

export const getBanners = () =>
  safe<Banner[]>([], (db) => db.from("banners").select("id,title,subtitle,image_path,link_url").order("display_order"));

export const getOffers = () =>
  safe<Offer[]>([], (db) =>
    db.from("offers").select("id,title,description,coupon_code,discount_type,discount_value,min_order_paise,banner_path").order("priority", { ascending: false }));

export async function getReviews(opts: { limit?: number; productId?: string; restaurantOnly?: boolean } = {}): Promise<Review[]> {
  return safe<Review[]>([], (db) => {
    let q = db.from("reviews").select("id,customer_name,rating,review_title,review_text,is_verified,product_id,image_paths,is_featured,created_at,products(name,slug)")
      .order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(opts.limit ?? 20);
    if (opts.productId) q = q.eq("product_id", opts.productId);
    if (opts.restaurantOnly) q = q.is("product_id", null);
    return q;
  });
}

/** Ratings of all published reviews (RLS only exposes published ones). */
export const getRatings = (productId?: string) =>
  safe<{ rating: number; status: string }[]>([], (db) => {
    let q = db.from("reviews").select("rating").limit(5000);
    if (productId) q = q.eq("product_id", productId);
    return q;
  }).then((rows) => rows.map((r) => ({ rating: r.rating, status: "published" })));

export function str(settings: Settings, key: string, fallback = ""): string {
  const v = settings[key];
  return typeof v === "string" ? v : fallback;
}
