import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { deleteCategory, moveCategory, saveCategory } from "./actions";

export const metadata = { title: "Categories" };

type Cat = { id: string; name: string; slug: string; parent_id: string | null; is_visible: boolean };

function Fields({ c, all }: { c?: Cat; all: Cat[] }) {
  const input = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><label className="sr-only" htmlFor={`n${c?.id ?? "new"}`}>Name</label><input id={`n${c?.id ?? "new"}`} name="name" defaultValue={c?.name} placeholder="Name" required className={input} /></div>
      <div><label className="sr-only" htmlFor={`s${c?.id ?? "new"}`}>Web address</label><input id={`s${c?.id ?? "new"}`} name="slug" defaultValue={c?.slug} placeholder="web-address (optional)" className={input} /></div>
      <div><label className="sr-only" htmlFor={`p${c?.id ?? "new"}`}>Parent category</label>
        <select id={`p${c?.id ?? "new"}`} name="parent_id" defaultValue={c?.parent_id ?? ""} className={input}><option value="">Top level</option>
          {all.filter((x) => x.id !== c?.id && !x.parent_id).map((x) => <option key={x.id} value={x.id}>Under {x.name}</option>)}</select></div>
      <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="is_visible" defaultChecked={c?.is_visible ?? true} />Visible to customers</label>
    </div>
  );
}

export default async function CategoriesPage() {
  const { db } = await requireAdmin("manager");
  const { data, error } = await db.from("categories").select("id,name,slug,parent_id,is_visible").order("display_order").order("name");
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load categories.</p>;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Categories</h1>
      <ActionForm action={saveCategory} className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h2 className="font-bold">Add a category</h2><Fields all={data} /><SubmitButton>Add category</SubmitButton>
      </ActionForm>
      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
            <ActionForm action={saveCategory} className="space-y-3"><Fields c={c} all={data} />
              <div className="flex flex-wrap items-center gap-2"><SubmitButton>Save</SubmitButton>
                <Link href={`/admin/media?tab=category&id=${c.id}`} className="flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold">Image</Link></div></ActionForm>
            <div className="flex items-center gap-2">
              {(["up", "down"] as const).map((d) => (
                <ActionForm key={d} action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value={d} />
                  <button aria-label={`Move ${c.name} ${d}`} className="flex size-9 items-center justify-center rounded-lg border border-line">{d === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}</button></ActionForm>))}
              <ActionForm action={deleteCategory} className="ml-auto"><input type="hidden" name="id" value={c.id} />
                <SubmitButton confirm={`Delete “${c.name}”? Its products stay on the menu but become uncategorised.`} className="border border-line bg-white text-[#c4301c]">Delete</SubmitButton></ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
