-- 1) Supabase Dashboard > Authentication > Users > Add user (email + strong password).
-- 2) Replace the email below and run this once in the SQL editor.
insert into admin_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'OWNER_EMAIL_HERE'
on conflict (user_id) do update set role = 'super_admin';
