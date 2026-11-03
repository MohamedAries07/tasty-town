-- Found by Supabase's security advisor on the live project.
-- Pin search_path on helper functions (linter 0011).
alter function set_updated_at() set search_path = public;
alter function gen_order_reference() set search_path = public;
alter function is_staff() set search_path = public;
alter function is_manager() set search_path = public;
alter function is_super() set search_path = public;

-- Trigger functions must never be callable through the API. Triggers still fire normally.
revoke execute on function log_order_status() from public, anon, authenticated;
revoke execute on function reviews_verify_check() from public, anon, authenticated;
-- current_admin_role()/is_* stay executable: row-level-security policies call them as the signed-in role.
