# TASTY TOWN — Phase 1: Foundation

Contents: Supabase migrations (schema, RLS, storage), seed (7 categories, 31 products), super-admin provisioning.

## Setup
1. Create a Supabase project. Copy URL, anon key and service-role key into `.env.local` (see `.env.example`).
2. `supabase link --project-ref <ref>` then `supabase db push`, then run `supabase/seed.sql` in the SQL editor.
3. Create the owner user in Authentication > Users, then run `supabase/provision_super_admin.sql` with their email.
4. Admin accounts are never created by public sign-up; only super admins can insert into `admin_roles`.

## Design notes
- Money is integer paise. `orders.total_paise = subtotal - discount + delivery_fee` is enforced by a CHECK.
- Orders have no anonymous access. The server (service role) creates them; guests view receipts via `receipt_token`.
- `idempotency_key` is unique to block duplicate submissions.
- Order status changes are logged to `order_status_history` by trigger.
- Order/product FKs on history use ON DELETE SET NULL plus name snapshots, so deleting products never breaks receipts.

## Phase 8 — PWA, hardening, verification

**PWA**: dynamic `manifest.webmanifest` from store settings, generated icons (incl. maskable), `sw.js` caching only static assets and public images (never `/admin`, `/api`, `/order`, or anything personal), offline page, update banner, install button (Android prompt + iOS instructions).

**Security headers**: CSP (self + your Supabase origin), `nosniff`, `X-Frame-Options: DENY`, referrer/permissions policy, HSTS, `no-store` + `noindex` on `/admin` and `/order`.

**Accessibility**: a contrast test found a real failure (success green `#1a8f3c` was 4.17:1 on white); it is now `#167a35` (5.4:1). The accent colour setting is validated for contrast before saving. Skip-to-content link added.

**Bugs found and fixed by the end-to-end run** (all would have reached production): unknown product/category pages answered HTTP 200 instead of 404 (loading screen streaming); the order detail page crashed with a 500 because a click handler was inside a server component; the storage API answered 403 instead of 401 when signed out; admin pages without a proper error boundary.

### How it was tested (local, dev-only tooling)
| Suite | Command | What it covers |
|---|---|---|
| Unit (32) | `npm test` | pricing, offers, hours (incl. overnight), phone, WhatsApp text, image pipeline, reviews, report maths, PDF validity, contrast |
| SQL (9 checkpoints) | `su postgres -c ./scripts/test-db.sh` | real PostgreSQL 16 running all migrations: RLS, roles, order creation/idempotency, offer limits, status workflow, revenue rules, verified-review trigger, storage policies |
| End-to-end (13) | `./scripts/e2e.sh` | the real Next.js app against real PostgreSQL + PostgREST: storefront data, PWA/headers, server-side pricing, checkout, receipts, WhatsApp states, reviews, rate limits, every admin page per role, API bypass attempts, PDF/CSV export |

`scripts/e2e.sh`, `scripts/test-db.sh` and `tests/sql`, `tests/e2e` are **development tooling**: they assume Linux, root, local ports and a PostgREST binary, and use stubs for Supabase Auth/Storage. They are not needed in production.

### Remaining limits (read before launch)
Not verified, because it needs a live environment or a real device:
1. **Never run on real Supabase or Vercel.** The tests used PostgreSQL + PostgREST with a small emulation layer. Real Supabase Auth (login, sessions, password rules), Storage (uploads, signed URLs, bucket policies as enforced by Supabase) and Realtime were **not** exercised. Expect to fix small integration issues on first deploy.
2. **Admin login and form submissions** were not driven end to end: pages and APIs were tested with simulated sessions, but the login form, server actions (save product, change status button, upload image through the UI) were never clicked in a browser.
3. **Image upload to Storage** was tested only for the processing pipeline (formats, sizes, EXIF), not the upload and rollback against real buckets.
4. **No browser or device testing**: layout on real phones, the service worker, install prompts, offline behaviour, the PWA on iOS, keyboard/screen-reader use. Contrast was checked by calculation, not by an audit tool.
5. **WhatsApp**: the app builds the message and opens `wa.me`; the restaurant must receive and confirm it manually. Delivery of the message cannot be detected, so "sent" is only the customer's own confirmation.
6. **Performance** (Lighthouse, large catalogues, many concurrent orders) was not measured. Rate limits are database-based and per phone/IP; behind a CDN confirm the real client IP header is honoured.
7. **Public pages are cached up to 60 s**, so menu/review changes can take up to a minute to appear.
8. **ESLint is not configured**; TypeScript strict checking passes.
9. **Backups, monitoring, email/SMS notifications, payments (online), and Tamil translations are out of scope** and not built.
10. Review photos and customer data are personal data: confirm retention and privacy-policy wording with your own legal advice.

Recommended rollout: staging Supabase project → complete `DEPLOYMENT.md` steps 1–6 → a week of staff-only test orders → public launch.
