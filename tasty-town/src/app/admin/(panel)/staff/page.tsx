import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase-admin";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { addStaff, changeRole, removeStaff } from "./actions";

export const metadata = { title: "Staff" };
const LABEL = { super_admin: "Owner (full access)", manager: "Manager", staff: "Staff (orders only)" } as const;

export default async function StaffPage() {
  const { db, user } = await requireAdmin("super_admin");
  const { data, error } = await db.from("admin_roles").select("user_id,role,created_at").order("created_at");
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load staff.</p>;
  const svc = serviceClient();
  const emails = await Promise.all(data.map(async (r) => (await svc.auth.admin.getUserById(r.user_id)).data.user?.email ?? "Unknown"));
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Staff</h1>
      <ul className="space-y-2">{data.map((r, i) => (
        <li key={r.user_id} className="space-y-2 rounded-xl border border-line bg-white p-3">
          <p className="truncate font-semibold">{emails[i]}{r.user_id === user.id && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <ActionForm action={changeRole} className="flex items-center gap-2"><input type="hidden" name="id" value={r.user_id} />
              <label className="sr-only" htmlFor={`r${r.user_id}`}>Role</label>
              <select id={`r${r.user_id}`} name="role" defaultValue={r.role} className="h-10 rounded-lg border border-line bg-white px-2 text-sm">{Object.entries(LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <SubmitButton>Change</SubmitButton></ActionForm>
            {r.user_id !== user.id && <ActionForm action={removeStaff}><input type="hidden" name="id" value={r.user_id} />
              <SubmitButton confirm={`Remove admin access for ${emails[i]}?`} className="border border-line bg-white text-[#c4301c]">Remove access</SubmitButton></ActionForm>}
          </div></li>))}</ul>
      <ActionForm action={addStaff} className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h2 className="font-bold">Add someone</h2>
        <div><label className="mb-1 block text-sm font-semibold" htmlFor="email">Email</label><input id="email" name="email" type="email" required className={input} /></div>
        <div><label className="mb-1 block text-sm font-semibold" htmlFor="role">Role</label><select id="role" name="role" defaultValue="staff" className={input}>{Object.entries(LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className="mb-1 block text-sm font-semibold" htmlFor="password">Starting password <span className="font-normal text-muted">(only for new accounts)</span></label><input id="password" name="password" type="text" autoComplete="off" minLength={10} className={input} /></div>
        <p className="text-xs text-muted">Staff see and update orders. Managers also run the menu, offers, media and reviews. Only owners change settings and staff.</p>
        <SubmitButton>Add or update</SubmitButton></ActionForm>
    </div>
  );
}
