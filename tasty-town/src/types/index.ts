export type FoodType = "veg" | "non_veg" | "egg";

export interface Category { id: string; name: string; slug: string; image_path: string | null; display_order: number }

export interface ProductImage { storage_path: string; variants: Record<string, string>; is_primary: boolean; display_order: number; width: number; height: number }

export interface Product {
  id: string; name: string; slug: string; description: string | null; price_paise: number;
  food_type: FoodType; is_available: boolean; is_featured: boolean; is_bestseller: boolean;
  categories: { name: string; slug: string } | null;
  product_images: ProductImage[];
}

export interface Offer {
  id: string; title: string; description: string | null; coupon_code: string | null;
  discount_type: "fixed" | "percentage"; discount_value: number; min_order_paise: number; banner_path: string | null;
}

export interface Banner { id: string; title: string | null; subtitle: string | null; image_path: string | null; link_url: string | null }

export interface Review {
  id: string; customer_name: string; rating: number; review_title: string | null; review_text: string | null;
  is_verified: boolean; product_id: string | null; image_paths: string[]; is_featured: boolean; created_at: string;
  products: { name: string; slug: string } | null;
}
export type ReviewWithImages = Review & { images: string[] };

export type Settings = Record<string, unknown>;

export interface Variant { id: string; name: string; price_delta_paise: number; is_available: boolean; is_default: boolean }
export interface Addon { id: string; name: string; price_paise: number; is_available: boolean }
export interface ProductDetail extends Product { product_variants: Variant[]; product_addons: Addon[] }
