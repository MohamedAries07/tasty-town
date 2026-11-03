import { redirect } from "next/navigation";
import { serverClient } from "./supabase-server";

export type Role = "super_admin" | "manager" | "staff";
const RANK: Record<Role, number> = { staff: 1, manager: 2, super_admin: 3 };

export async function getAdmin() {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser(); // verified with the auth server, not just the cookie
  if (!user) return null;
  const { data } = await db.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { db, user, role: data.role as Role };
}

export function hasRole(role: Role, min: Role) { return RANK[role] >= RANK[min]; }

/** For pages and layouts: redirects to login if not an admin of at least `min`. */
export async function requireAdmin(min: Role = "staff") {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasRole(admin.role, min)) redirect("/admin");
  return admin;
}
