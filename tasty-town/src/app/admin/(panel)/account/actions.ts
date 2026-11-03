"use server";
import { guard, type ActionState } from "@/lib/admin";

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await guard("staff"); if (!a) return { error: "Please sign in again." };
  const pw = String(fd.get("password") ?? ""), again = String(fd.get("again") ?? "");
  if (pw.length < 10) return { error: "Use at least 10 characters." };
  if (pw !== again) return { error: "The two passwords don't match." };
  const { error } = await a.db.auth.updateUser({ password: pw });
  if (error) return { error: "Couldn't change the password. Try signing in again first." };
  return { ok: "Password changed." };
}
