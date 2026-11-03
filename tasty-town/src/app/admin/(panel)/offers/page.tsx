import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { offerLabel } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { toggleOffer } from "./actions";

export const metadata = { title: "Offers" };

export default async function OffersAdmin() {
  const { db } = await requireAdmin("manager");
  const { data, error } = await db.from("offers").select("id,title,coupon_code,discount_type,discount_value,is_active,starts_at,ends_at,usage_limit,usage_count").order("created_at", { ascending: false });
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load offers.</p>;
  const now = Date.now();
  const when = (o: { starts_at: string | null; ends_at: string | null; is_active: boolean }) =>
    !o.is_active ? "Inactive" : o.ends_at && new Date(o.ends_at).getTime() <= now ? "Expired" : o.starts_at && new Date(o.starts_at).getTime() > now ? "Scheduled" : "Live";
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-tight">Offers</h1>
        <Link href="/admin/offers/new" className="flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" />New</Link></div>
      {data.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No offers yet.</p> : (
        <ul className="space-y-2">{data.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3">
            <div className="min-w-0"><Link href={`/admin/offers/${o.id}`} className="font-semibold underline-offset-4 hover:underline">{o.title}</Link>
              <p className="text-xs text-muted">{offerLabel(o)} · {o.coupon_code ? `Code ${o.coupon_code}` : "Automatic"} · {when(o)}{o.usage_limit ? ` · ${o.usage_count}/${o.usage_limit} used` : ""}</p></div>
            <ActionForm action={toggleOffer}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="value" value={String(!o.is_active)} />
              <SubmitButton className={`!min-h-8 !px-3 !text-xs ${o.is_active ? "bg-lime text-ink" : "border border-line bg-white text-muted"}`}>{o.is_active ? "Active" : "Inactive"}</SubmitButton></ActionForm>
          </li>))}</ul>)}
    </div>
  );
}
