# TASTY TOWN — Deployment guide

Follow in order. Nothing here has been run against a live Supabase project or Vercel yet (see `README.md` → "Remaining limits"), so do steps 1–6 on a **staging** project first.

## 1. Supabase project
1. Create a project at supabase.com (pick the region closest to Samayapuram, e.g. Mumbai `ap-south-1`).
2. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.
3. **SQL Editor** → run these files **in this order**, one at a time, each must finish without error:
   1. `supabase/migrations/20261030000001_schema.sql`
   2. `supabase/migrations/20261030000002_rls_storage.sql`
   3. `supabase/migrations/20261031000003_media.sql`
   4. `supabase/migrations/20261031000004_orders.sql`
   5. `supabase/migrations/20261101000005_admin.sql`
   6. `supabase/migrations/20261102000006_reviews.sql`
   7. `supabase/migrations/20261103000007_analytics.sql`
   8. `supabase/migrations/20261104000008_harden_functions.sql`
   9. `supabase/seed.sql` (categories and the 31 menu items)
4. **Storage**: confirm 5 buckets exist: `product-images`, `category-images`, `promotional-banners`, `restaurant-assets` (public) and `review-images` (private).
5. **Authentication → Providers**: keep Email on. Turn **off** "Allow new users to sign up" (staff are created by the owner inside the admin).
6. **Authentication → Users → Add user**: create the owner (email + strong password), then run `supabase/provision_super_admin.sql` with that email.
7. **Database → Replication**: confirm `orders` is in the `supabase_realtime` publication (migration 5 does this; verify).

## 2. Environment variables (Vercel → Project → Settings → Environment Variables, Production)
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**secret**, never `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (no trailing slash) |

## 3. Vercel
1. Push the project to a Git repo, import it in Vercel (framework: Next.js; defaults are fine).
2. Deploy. Fonts for PDF reports are traced via `next.config.ts` — confirm a PDF downloads after deploy (step 6).
3. Add your custom domain; Vercel provisions HTTPS. HSTS and CSP headers are already set in `next.config.ts`.

## 4. First-run configuration (in `/admin`)
1. Sign in at `/admin/login` as the owner.
2. **Settings**: business name, WhatsApp number (digits with country code, e.g. `919791951598`), delivery fee / free threshold / minimum order, opening hours and holidays, accent colour (must keep text readable; the form checks).
3. **Media**: upload product photos and banners. **Products**: check prices against your menu.
4. **Staff**: add managers and staff. Staff can only process orders; managers manage menu, offers, reviews, reports.

## 5. Real-device checks you must do (nobody has done these yet)
- Android Chrome: install the app from the footer button; open it offline (should show the offline page).
- iPhone Safari: Share → Add to Home Screen; icon and name look right.
- Place a real test order (delivery and takeaway) on a phone; tap "Send order on WhatsApp" and confirm the message arrives readable on the restaurant WhatsApp, including ₹, Tamil/English names and line breaks.
- Open the admin on a phone and a laptop **while** a second device places an order: the new order should appear without refresh (Realtime).
- Upload a large phone photo (5–10 MB, portrait) as a product image: check orientation, speed and that the storefront shows it.

## 6. Post-deploy smoke test
1. `/`, `/menu`, a product page, `/offers`, `/about` load; `/manifest.webmanifest` and `/sw.js` return 200.
2. `/admin` redirects to login when signed out; staff cannot open Products/Settings.
3. Place an order → receipt link works only with its `?t=` token → admin shows it → move it through statuses → mark completed + paid.
4. Submit a review from the receipt of that order → it shows "pending" in `/admin/reviews` → approve → it appears on the product page within ~60 s with "Verified order".
5. `/admin/reports`: download PDF and CSV; open the CSV in Excel (₹ and names should be correct).
6. Delete the test orders (or keep them out of reports by date).

## 7. Backups and operations
- Enable Supabase daily backups (Pro plan) or schedule `pg_dump` yourself; the free plan has none.
- Rotate the service_role key if it is ever exposed; update it in Vercel and redeploy.
- Orders store prices as integer paise snapshots; changing menu prices never changes old receipts.
