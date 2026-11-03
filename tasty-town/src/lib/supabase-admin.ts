import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client. Bypasses RLS, so it is only for server code that has already validated the request. */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
