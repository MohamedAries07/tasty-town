"use server";
import { revalidatePath } from "next/cache";
import { audit, dbError, guard, isUuid, NO_PERMISSION, str, type ActionState } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase-admin";

const ROLES = ["super_admin", "manager", "staff"];

async function findUserId(email: string): Promise<string | null> {
  const svc = serviceClient();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function addStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const email = str(fd, "email").toLowerCase(), role = str(fd, "role"), password = String(fd.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  try {
    let userId = await findUserId(email);
    if (!userId) {
      if (password.length < 10) return { error: "New accounts need a starting password of at least 10 characters. Share it privately; they can change it under Account." };
      const { data, error } = await serviceClient().auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) return { error: "Couldn't create that account." };
      userId = data.user.id;
    }
    const { error } = await a.db.from("admin_roles").upsert({ user_id: userId, role, created_by: a.user.id }, { onConflict: "user_id" });
    if (error) return dbError(error, "Couldn't assign the role.");
    await audit(a, "staff.add", "staff", userId, { email, role });
  } catch (e) { console.error("[staff-add]", e); return { error: "Couldn't add that person. Check the server configuration." }; }
  revalidatePath("/admin/staff"); return { ok: "Saved." };
}

async function lastSuperAdmin(a: NonNullable<Awaited<ReturnType<typeof guard>>>, userId: string) {
  const { data } = await a.db.from("admin_roles").select("user_id").eq("role", "super_admin");
  return (data ?? []).length === 1 && data![0].user_id === userId;
}

export async function changeRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"), role = str(fd, "role");
  if (!isUuid(id) || !ROLES.includes(role)) return { error: "Invalid request." };
  if (role !== "super_admin" && (id === a.user.id || await lastSuperAdmin(a, id))) return { error: "You can't remove the last owner, or demote yourself." };
  const { error } = await a.db.from("admin_roles").update({ role }).eq("user_id", id);
  if (error) return dbError(error, "Couldn't change the role.");
  await audit(a, "staff.role", "staff", id, { role }); revalidatePath("/admin/staff"); return { ok: "Role updated." };
}

export async function removeStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("super_admin"); if (!a) return NO_PERMISSION;
  const id = str(fd, "id"); if (!isUuid(id)) return { error: "Invalid request." };
  if (id === a.user.id || await lastSuperAdmin(a, id)) return { error: "You can't remove yourself or the last owner." };
  const { error } = await a.db.from("admin_roles").delete().eq("user_id", id);
  if (error) return dbError(error, "Couldn't remove access.");
  await audit(a, "staff.remove", "staff", id); revalidatePath("/admin/staff"); return undefined;
}
