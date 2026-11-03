import { ActionForm, SubmitButton } from "./ActionForm";
import { deleteReview, saveReview } from "@/app/admin/(panel)/reviews/actions";

type R = { id?: string; customer_name?: string; rating?: number; review_title?: string | null; review_text?: string | null; product_id?: string | null; status?: string; is_featured?: boolean; is_verified?: boolean };

export function ReviewAdminForm({ r = {}, products }: { r?: R; products: { id: string; name: string }[] }) {
  const input = "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm", label = "mb-1 block text-sm font-semibold";
  return (
    <div className="max-w-xl space-y-5">
      <ActionForm action={saveReview} className="space-y-4">
        {r.id && <input type="hidden" name="id" value={r.id} />}
        {!r.id && <p className="rounded-lg bg-paper p-3 text-xs text-muted">Only add reviews that real customers actually gave you (for example, sent by message). They are shown as not verified. Never invent reviews.</p>}
        {r.is_verified && <p className="text-sm font-medium">Verified order: this review is linked to a completed order.</p>}
        <div><label className={label} htmlFor="customer_name">Reviewer name</label><input id="customer_name" name="customer_name" defaultValue={r.customer_name} required maxLength={60} className={input} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label} htmlFor="rating">Rating</label><select id="rating" name="rating" defaultValue={r.rating ?? 5} className={input}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select></div>
          <div><label className={label} htmlFor="status">Status</label><select id="status" name="status" defaultValue={r.status === "pending" ? "pending" : "published"} className={input}><option value="published">Published</option><option value="pending">Hidden (pending)</option></select></div>
        </div>
        <div><label className={label} htmlFor="product_id">About</label><select id="product_id" name="product_id" defaultValue={r.product_id ?? ""} className={input}><option value="">TASTY TOWN overall</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className={label} htmlFor="review_title">Title</label><input id="review_title" name="review_title" defaultValue={r.review_title ?? ""} maxLength={80} className={input} /></div>
        <div><label className={label} htmlFor="review_text">Review</label><textarea id="review_text" name="review_text" defaultValue={r.review_text ?? ""} required rows={4} maxLength={800} className="w-full rounded-lg border border-line bg-white p-3 text-sm" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={r.is_featured} />Feature on the homepage first</label>
        <SubmitButton className="h-11 w-full bg-ink text-white">{r.id ? "Save changes" : "Add review"}</SubmitButton>
      </ActionForm>
      {r.id && <ActionForm action={deleteReview}><input type="hidden" name="id" value={r.id} /><SubmitButton confirm="Delete this review and its photos permanently?" className="bg-[#c4301c] text-white">Delete review</SubmitButton></ActionForm>}
    </div>
  );
}
