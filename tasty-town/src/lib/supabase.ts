import { createClient } from "@supabase/supabase-js";

/** Anon, read-only client for public storefront data. RLS limits what it can see. */
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function publicImageUrl(bucket: string, path: string | null | undefined): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !path) return null;
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
