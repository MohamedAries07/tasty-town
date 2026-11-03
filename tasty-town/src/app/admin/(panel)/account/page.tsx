import { requireAdmin } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { changePassword } from "./actions";

export const metadata = { title: "Account" };
export default async function AccountPage() {
  const { user, role } = await requireAdmin("staff");
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";
  return (
    <div className="max-w-sm space-y-4"><h1 className="text-2xl font-black tracking-tight">Account</h1>
      <p className="text-sm text-muted">{user.email} · {role.replace("_", " ")}</p>
      <ActionForm action={changePassword} className="space-y-3">
        <div><label className="mb-1 block text-sm font-semibold" htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" required className={input} /></div>
        <div><label className="mb-1 block text-sm font-semibold" htmlFor="again">Repeat password</label><input id="again" name="again" type="password" autoComplete="new-password" required className={input} /></div>
        <SubmitButton>Change password</SubmitButton></ActionForm></div>
  );
}
