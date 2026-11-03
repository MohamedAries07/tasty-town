-- Role helpers (database-backed, never client-supplied)
create or replace function current_admin_role() returns admin_role
language sql stable security definer set search_path = public as $$
  select role from admin_roles where user_id = auth.uid() $$;
create or replace function is_staff() returns boolean language sql stable as $$
  select current_admin_role() is not null $$;
create or replace function is_manager() returns boolean language sql stable as $$
  select current_admin_role() in ('super_admin','manager') $$;
create or replace function is_super() returns boolean language sql stable as $$
  select current_admin_role() = 'super_admin' $$;

do $$ declare t text; begin
  foreach t in array array['profiles','admin_roles','categories','products','product_images',
    'product_variants','product_addons','offers','offer_products','offer_categories','orders',
    'order_items','order_status_history','store_settings','store_hours','delivery_zones',
    'banners','reviews','audit_logs'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Public catalogue reads
create policy "public read categories" on categories for select using (is_visible);
create policy "public read products" on products for select using (not is_archived);
create policy "public read images" on product_images for select using (true);
create policy "public read variants" on product_variants for select using (true);
create policy "public read addons" on product_addons for select using (true);
create policy "public read offers" on offers for select using (
  is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read offer_products" on offer_products for select using (true);
create policy "public read offer_categories" on offer_categories for select using (true);
create policy "public read banners" on banners for select using (
  is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read hours" on store_hours for select using (true);
create policy "public read zones" on delivery_zones for select using (is_active);
create policy "public read settings" on store_settings for select using (is_public);
create policy "public read reviews" on reviews for select using (status = 'published');

-- Manager-level catalogue writes
do $$ declare t text; begin
  foreach t in array array['categories','products','product_images','product_variants',
    'product_addons','offers','offer_products','offer_categories','banners','reviews'] loop
    execute format('create policy "manager all %1$s" on %1$I for all using (is_manager()) with check (is_manager())', t);
  end loop;
end $$;

-- Super-admin only: settings, hours, zones, roles
do $$ declare t text; begin
  foreach t in array array['store_settings','store_hours','delivery_zones','admin_roles'] loop
    execute format('create policy "super all %1$s" on %1$I for all using (is_super()) with check (is_super())', t);
  end loop;
end $$;
create policy "manager read settings" on store_settings for select using (is_manager());
create policy "self read role" on admin_roles for select using (user_id = auth.uid());

-- Orders: NO anonymous access. Orders are created by the server (service role).
create policy "own orders" on orders for select using (user_id = auth.uid());
create policy "staff read orders" on orders for select using (is_staff());
create policy "staff update orders" on orders for update using (is_staff()) with check (is_staff());
create policy "own order items" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff read order items" on order_items for select using (is_staff());
create policy "staff read history" on order_status_history for select using (is_staff());
create policy "staff write history" on order_status_history for insert with check (is_staff());

-- Profiles, audit
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "manager read profiles" on profiles for select using (is_manager());
create policy "super read audit" on audit_logs for select using (is_super());
create policy "staff write audit" on audit_logs for insert with check (is_staff() and actor_id = auth.uid());

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images','product-images',true,5242880,array['image/avif','image/webp']),
  ('category-images','category-images',true,5242880,array['image/avif','image/webp']),
  ('promotional-banners','promotional-banners',true,5242880,array['image/avif','image/webp']),
  ('restaurant-assets','restaurant-assets',true,5242880,array['image/avif','image/webp','image/png','image/svg+xml']),
  ('review-images','review-images',false,5242880,array['image/avif','image/webp'])
on conflict (id) do nothing;

-- Public read only for restaurant-owned buckets; review-images stays private
do $$ declare b text; begin
  foreach b in array array['product-images','category-images','promotional-banners','restaurant-assets'] loop
    execute format('create policy "public read %1$s" on storage.objects for select using (bucket_id = %1$L)', b);
    execute format('create policy "manager write %1$s" on storage.objects for all using (bucket_id = %1$L and is_manager()) with check (bucket_id = %1$L and is_manager())', b);
  end loop;
end $$;
create policy "manager manage review-images" on storage.objects for all
  using (bucket_id = 'review-images' and is_manager())
  with check (bucket_id = 'review-images' and is_manager());
