import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Stars } from "@/components/ReviewCard";
import { setReviewStatus, toggleFeatured } from "./actions";

export const metadata = { title: "Reviews" };
const TONE: Record<string, string> = { pending: "bg-[#fff1d6] text-[#8a5a00]", published: "bg-lime text-ink", rejected: "bg-[#fde4e0] text-[#a02312]" };

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; rating?: string }> }) {
  const { db } = await requireAdmin("manager");
  const sp = await searchParams, status = ["pending", "published", "rejected"].includes(sp.status ?? "") ? sp.status! : "pending";
  let q = db.from("reviews").select("id,customer_name,rating,review_title,review_text,image_paths,is_verified,is_featured,admin_created,status,created_at,products(name)").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  if (sp.status === "all") q = db.from("reviews").select("id,customer_name,rating,review_title,review_text,image_paths,is_verified,is_featured,admin_created,status,created_at,products(name)").order("created_at", { ascending: false }).limit(100);
  if (/^[1-5]$/.test(sp.rating ?? "")) q = q.eq("rating", Number(sp.rating));
  if (sp.q) q = q.or(`customer_name.ilike.%${sp.q.replace(/[%_,()]/g, " ")}%,review_text.ilike.%${sp.q.replace(/[%_,()]/g, " ")}%,review_title.ilike.%${sp.q.replace(/[%_,()]/g, " ")}%`);
  const { data, error } = await q;
  if (error) return <p role="alert" className="text-sm text-[#c4301c]">Couldn’t load reviews. Check that all migrations have been applied.</p>;
  const field = "h-10 rounded-lg border border-line bg-white px-3 text-sm", fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const act = (id: string, st: string, label: string, cls = "bg-ink text-white") => (
    <ActionForm action={setReviewStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={st} />
      <SubmitButton className={`!min-h-9 !px-3 !text-xs ${cls}`} confirm={st === "rejected" ? "Reject this review? Any customer photos will be deleted." : undefined}>{label}</SubmitButton></ActionForm>);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-tight">Reviews</h1>
        <Link href="/admin/reviews/new" className="flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" />Add</Link></div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search" aria-label="Search reviews" className={`${field} flex-1`} />
        <select name="status" defaultValue={sp.status ?? "pending"} aria-label="Status" className={field}><option value="pending">Awaiting approval</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="all">All</option></select>
        <select name="rating" defaultValue={sp.rating ?? ""} aria-label="Rating" className={field}><option value="">Any rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select>
        <button className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold">Filter</button>
      </form>
      {data.length === 0 ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No reviews here.</p> : (
        <ul className="space-y-3">{data.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-2"><Stars value={r.rating} /><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.status]}`}>{r.status === "pending" ? "Awaiting approval" : r.status}</span></div>
            {r.review_title && <p className="font-bold">{r.review_title}</p>}{r.review_text && <p className="text-sm text-muted">{r.review_text}</p>}
            <p className="text-xs text-muted">{r.customer_name} · {fmt.format(new Date(r.created_at))}{(r.products as unknown as { name: string } | null) ? ` · ${(r.products as unknown as { name: string }).name}` : " · Restaurant"}
              {r.is_verified ? " · Verified order" : r.admin_created ? " · Added by admin" : " · Not verified"}{r.image_paths.length ? ` · ${r.image_paths.length} photo${r.image_paths.length > 1 ? "s" : ""}` : ""}</p>
            <div className="flex flex-wrap items-center gap-2">
              {r.status !== "published" && act(r.id, "published", r.status === "pending" ? "Approve & publish" : "Publish", "bg-lime text-ink")}
              {r.status === "published" && act(r.id, "pending", "Unpublish", "border border-line bg-white")}
              {r.status !== "rejected" && act(r.id, "rejected", "Reject", "border border-line bg-white text-[#c4301c]")}
              {r.status === "published" && <ActionForm action={toggleFeatured}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="value" value={String(!r.is_featured)} />
                <SubmitButton className={`!min-h-9 !px-3 !text-xs ${r.is_featured ? "bg-lime text-ink" : "border border-line bg-white"}`}>{r.is_featured ? "Featured" : "Feature"}</SubmitButton></ActionForm>}
              <Link href={`/admin/reviews/${r.id}`} className="flex min-h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold">Edit{r.image_paths.length ? " / photos" : ""}</Link>
            </div></li>))}</ul>)}
    </div>
  );
}
