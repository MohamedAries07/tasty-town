import { getAdmin, hasRole, type Role } from "./auth";

export type ActionState = { error?: string; ok?: string } | undefined;
export const NO_PERMISSION: ActionState = { error: "You don't have permission to do that." };

/** Server-action guard: verifies the session and database role on every call. */
export async function guard(min: Role) {
  const a = await getAdmin();
  return a && hasRole(a.role, min) ? a : null;
}
type Admin = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;
export async function audit(a: Admin, action: string, entity: string, entityId?: string, details?: object) {
  await a.db.from("audit_logs").insert({ actor_id: a.user.id, action, entity, entity_id: entityId ?? null, details: details ?? null });
}
export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const flag = (fd: FormData, k: string) => fd.get(k) === "on";
export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function dbError(e: { code?: string; message?: string } | null, fallback: string): ActionState {
  if (e?.code === "23505") return { error: "That name, web address or code is already in use." };
  console.error("[admin-action]", e);
  return { error: fallback };
}
