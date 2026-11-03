"use server";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";

export async function signIn(_: { error?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const db = await serverClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Incorrect email or password." };
  const { data: role } = await db.from("admin_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!role) {
    await db.auth.signOut();
    return { error: "This account does not have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await serverClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
