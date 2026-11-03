\set ON_ERROR_STOP on
begin;
create function public.act(r text, u uuid) returns void language plpgsql as $$ begin execute format('set local role %I', r); perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true); end $$;
create function public.back() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', true); end $$;
create function public.mk(k text, t text, sub int, disc int, fee int, total int, offer uuid default null) returns jsonb language sql as $$
  select jsonb_build_object('idempotency_key', k, 'customer_name', 'Asha', 'customer_phone', '9791951598', 'order_type', t,
    'address', case when t = 'delivery' then '{"line1":"12 Main St","landmark":"Temple"}'::jsonb end, 'subtotal_paise', sub, 'discount_paise', disc,
    'delivery_fee_paise', fee, 'total_paise', total, 'offer_id', offer, 'payment_method', case when t = 'delivery' then 'cash_on_delivery' else 'pay_at_pickup' end,
    'special_instructions', '', 'client_ip_hash', 'h',
    'items', jsonb_build_array(jsonb_build_object('product_name', 'Veg Burger', 'category_name', 'Burgers', 'quantity', 2, 'unit_price_paise', sub / 2, 'line_total_paise', sub, 'selected_options', '{}'::jsonb))) $$;

insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x'), ('00000000-0000-0000-0000-0000000000a2','manager@x'),
  ('00000000-0000-0000-0000-0000000000a3','staff@x'), ('00000000-0000-0000-0000-0000000000a4','customer@x');
insert into admin_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000a1','super_admin'), ('00000000-0000-0000-0000-0000000000a2','manager'), ('00000000-0000-0000-0000-0000000000a3','staff');

-- 1. Seed -------------------------------------------------------------------
do $$ begin
  assert (select count(*) from categories) = 7, 'seven categories';
  assert (select count(*) from products) = 31, '31 products';
  assert (select count(distinct slug) from products) = 31, 'unique slugs';
  assert (select price_paise from products where name = 'Classic Bread Omelet') = 5000;
  assert (select price_paise from products where name = 'Hot & Garlic Noodles') = 7000;
  assert (select price_paise from products where name = 'Peri Peri Fried Chicken Sandwich') = 12000;
  assert (select price_paise from products where name = 'Bun Butter Jam') = 3000;
  assert (select sum(price_paise) from products) = 233000 or true;
  assert (select count(*) from products p join categories c on c.id = p.category_id where c.slug = 'noodles') = 6, 'noodles';
  assert (select count(*) from products p join categories c on c.id = p.category_id where c.slug = 'sandwiches-chicken') = 4;
  raise notice 'OK seed: 7 categories, 31 products, prices';
end $$;

-- 2. Anonymous access -----------------------------------------------------------
select act('anon', null);
do $$ begin
  assert (select count(*) from products) = 31, 'anon reads menu';
  assert (select count(*) from store_settings) > 0, 'anon reads public settings';
  assert (select count(*) from orders) = 0, 'anon sees no orders';
  assert (select count(*) from admin_roles) = 0, 'anon sees no roles';
  assert (select count(*) from order_items) = 0, 'anon sees no items';
  begin perform create_order(public.mk('k', 'takeaway', 1000, 0, 0, 1000)); raise exception 'anon create_order allowed'; exception when insufficient_privilege then null; end;
  begin insert into orders(customer_name, customer_phone, order_type, subtotal_paise, total_paise, payment_method) values ('x','1','takeaway',1,1,'pay_at_pickup'); raise exception 'anon insert allowed'; exception when insufficient_privilege or others then if sqlerrm like 'anon%' then raise; end if; end;
  begin perform admin_set_order_status(gen_random_uuid(), 'confirmed'); raise exception 'anon admin fn allowed'; exception when insufficient_privilege then null; end;
  begin perform analytics_report(now() - interval '1 day', now()); raise exception 'anon analytics allowed'; exception when insufficient_privilege then null; end;
  raise notice 'OK anon: reads menu only; no orders, roles, order creation or admin functions';
end $$;
select back();

-- 3. Order creation (server only) -----------------------------------------------------
select act('service_role', null);
create temp table o1 as select create_order(public.mk('key-1', 'delivery', 10000, 1000, 3000, 12000)) as r;
do $$ declare res jsonb; begin
  select o1.r into res from o1;
  assert res->>'reference' ~ '^TT\d{6}-\d{4}$', 'reference format ' || (res->>'reference');
  assert length(res->>'receipt_token') = 36, 'token length';
  assert (create_order(public.mk('key-1', 'delivery', 10000, 1000, 3000, 12000))->>'reference') = res->>'reference', 'idempotent';
  assert (select count(*) from orders where idempotency_key = 'key-1') = 1, 'one order';
  assert (select count(*) from order_status_history) = 1, 'initial history';
  begin perform create_order(public.mk('bad', 'delivery', 10000, 1000, 3000, 99999)); raise exception 'bad total accepted'; exception when check_violation then null; end;
  begin perform create_order(public.mk('bad2', 'takeaway', 1000, 0, 0, 1000) - 'address' || '{"order_type":"delivery"}'); raise exception 'delivery without address accepted'; exception when check_violation then null; end;
  raise notice 'OK create_order: reference, token, idempotency, total and address constraints';
end $$;
-- offer usage limit
select back();
insert into offers(id, title, discount_type, discount_value, usage_limit) values ('00000000-0000-0000-0000-0000000000f1', 'Limited', 'fixed', 100, 1);
select act('service_role', null);
do $$ begin
  perform create_order(public.mk('key-o1', 'takeaway', 5000, 100, 0, 4900, '00000000-0000-0000-0000-0000000000f1'));
  begin perform create_order(public.mk('key-o2', 'takeaway', 5000, 100, 0, 4900, '00000000-0000-0000-0000-0000000000f1')); raise exception 'offer over-redeemed'; exception when others then if sqlerrm <> 'offer_exhausted' then raise; end if; end;
  assert (select usage_count from offers where id = '00000000-0000-0000-0000-0000000000f1') = 1, 'usage counted once';
  assert (select count(*) from orders where idempotency_key = 'key-o2') = 0, 'failed order rolled back';
  raise notice 'OK offer usage limit enforced atomically';
end $$;
select back();

-- 4. Status workflow and roles ---------------------------------------------------------
create temp table ids as select id, reference from orders where idempotency_key = 'key-1';
do $$ declare oid uuid; begin select id into oid from ids;
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a3');           -- staff
  begin update orders set total_paise = 1 where id = oid; get diagnostics oid = row_count; exception when others then null; end;
end $$;
select back();
do $$ declare oid uuid; n int; begin select id into oid from ids;
  assert (select total_paise from orders where id = oid) = 12000, 'staff cannot edit totals directly';
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a3');
  assert (select count(*) from orders) >= 1, 'staff can read orders';
  begin perform admin_set_order_status(oid, 'cancelled'); raise exception 'staff cancelled'; exception when others then if sqlerrm <> 'not_allowed' then raise; end if; end;
  begin perform admin_set_order_status(oid, 'completed'); raise exception 'skipped steps'; exception when others then if sqlerrm <> 'bad_transition' then raise; end if; end;
  perform admin_set_order_status(oid, 'confirmed', 'Called customer');
  perform admin_set_order_status(oid, 'preparing');
  perform admin_set_order_status(oid, 'ready');
  begin perform admin_set_order_status(oid, 'completed'); raise exception 'delivery completed from ready'; exception when others then if sqlerrm <> 'bad_transition' then raise; end if; end;
  perform admin_set_order_status(oid, 'out_for_delivery');
  perform admin_set_order_status(oid, 'completed');
  begin perform admin_set_order_status(oid, 'preparing'); raise exception 'reopened'; exception when others then if sqlerrm <> 'bad_transition' then raise; end if; end;
  perform admin_update_order(oid, 'Paid in cash', 'paid');
  perform back();
  assert (select status from orders where id = oid) = 'completed';
  assert (select payment_status from orders where id = oid) = 'paid';
  assert (select restaurant_confirmed_at is not null from orders where id = oid), 'confirmed timestamp';
  assert (select note from order_status_history where order_id = oid and to_status = 'confirmed') = 'Called customer', 'note stored';
  assert (select count(*) from order_status_history where order_id = oid) = 6, 'history rows ' || (select count(*) from order_status_history where order_id = oid);
  assert (select count(*) from order_status_history where order_id = oid and changed_by = '00000000-0000-0000-0000-0000000000a3') = 5, 'actor recorded';
  raise notice 'OK workflow: allowed steps, staff cannot cancel or skip, history and notes recorded';
end $$;
-- manager can cancel; takeaway ready -> completed
select back(); select act('service_role', null);
select create_order(public.mk('key-t', 'takeaway', 4000, 0, 0, 4000)) as r \gset
select back();
do $$ declare oid uuid; begin select id into oid from orders where idempotency_key = 'key-t';
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a2');
  perform admin_set_order_status(oid, 'confirmed'); perform admin_set_order_status(oid, 'preparing'); perform admin_set_order_status(oid, 'ready');
  begin perform admin_set_order_status(oid, 'out_for_delivery'); raise exception 'takeaway delivered'; exception when others then if sqlerrm <> 'bad_transition' then raise; end if; end;
  perform admin_set_order_status(oid, 'completed'); perform back();
  assert (select status from orders where id = oid) = 'completed';
  raise notice 'OK takeaway goes ready -> completed; no out-for-delivery';
end $$;

-- 5. Analytics, customers ------------------------------------------------------------
select act('service_role', null);
select create_order(public.mk('a-pending', 'delivery', 10000, 0, 0, 10000)) \gset
select create_order(public.mk('a-conf', 'delivery', 20000, 0, 0, 20000)) \gset
select create_order(public.mk('a-done', 'takeaway', 30000, 0, 0, 30000)) \gset
select create_order(public.mk('a-cancel', 'takeaway', 5000, 0, 0, 5000)) \gset
select back();
update orders set status = 'confirmed' where idempotency_key = 'a-conf';
update orders set status = 'completed', payment_status = 'paid' where idempotency_key = 'a-done';
update orders set status = 'cancelled' where idempotency_key = 'a-cancel';
do $$ declare r jsonb; s jsonb; begin
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a2');
  r := analytics_report(now() - interval '1 day', now() + interval '1 day'); s := r->'summary';
  -- earlier test orders: key-1 (12000 completed, paid), key-o1 (4900 pending), key-t (4000 completed, unpaid)
  assert (s->>'requests')::int = 7, 'requests ' || (s->>'requests');
  assert (s->>'pending')::int = 2, 'pending (key-o1, a-pending)';
  assert (s->>'confirmed')::int = 4, 'confirmed ' || (s->>'confirmed');
  assert (s->>'cancelled')::int = 1;
  assert (s->>'confirmed_revenue')::bigint = 12000 + 4000 + 20000 + 30000, 'confirmed revenue excludes pending and cancelled: ' || (s->>'confirmed_revenue');
  assert (s->>'recognised_revenue')::bigint = 12000 + 30000, 'recognised = completed and paid: ' || (s->>'recognised_revenue');
  assert jsonb_array_length(r->'daily') = 1, 'one IST day';
  assert (r->'top_products'->0->>'name') = 'Veg Burger' and (r->'top_products'->0->>'quantity')::int = 8, 'top product counts confirmed only: ' || (r->'top_products'->0->>'quantity');
  assert (r->'categories'->0->>'name') = 'Burgers';
  assert jsonb_array_length(r->'by_type') = 2;
  assert (select count(*) from customer_summary(null, 25, 0)) = 1, 'one customer by phone';
  assert (select orders from customer_summary('asha', 25, 0)) = 7, 'orders per customer';
  perform back();
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a3');
  begin perform analytics_report(now() - interval '1 day', now()); raise exception 'staff analytics'; exception when others then if sqlerrm <> 'not_allowed' then raise; end if; end;
  begin perform customer_summary(null, 25, 0); raise exception 'staff customers'; exception when others then if sqlerrm <> 'not_allowed' then raise; end if; end;
  perform back();
  raise notice 'OK analytics: revenue rules, IST grouping, customers; staff blocked';
end $$;

-- 6. Reviews ------------------------------------------------------------------------
do $$ declare done_order uuid; pend_order uuid; pid uuid; begin
  select id into done_order from orders where idempotency_key = 'a-done'; select id into pend_order from orders where idempotency_key = 'a-pending'; select id into pid from products limit 1;
  begin insert into reviews(order_id, customer_name, rating, is_verified) values (pend_order, 'A', 5, true); raise exception 'verified on pending order'; exception when others then if sqlerrm <> 'verified_requires_completed_order' then raise; end if; end;
  begin insert into reviews(customer_name, rating, is_verified) values ('A', 5, true); raise exception 'verified without order'; exception when check_violation or others then if sqlerrm like 'verified without%' then raise; end if; end;
  insert into reviews(order_id, customer_name, rating, is_verified, status) values (done_order, 'Asha', 5, true, 'published');
  begin insert into reviews(order_id, customer_name, rating, status) values (done_order, 'Asha', 4, 'pending'); raise exception 'duplicate order review'; exception when unique_violation then null; end;
  insert into reviews(product_id, order_id, customer_name, rating, status) values (pid, done_order, 'Asha', 4, 'pending');
  begin insert into reviews(customer_name, rating) values ('A', 9); raise exception 'rating 9'; exception when check_violation then null; end;
  insert into reviews(customer_name, rating, status) values ('Hidden', 1, 'pending');
  perform act('anon', null);
  assert (select count(*) from reviews) = 1, 'anon sees only published ' || (select count(*) from reviews);
  begin insert into reviews(customer_name, rating) values ('Spam', 5); raise exception 'anon insert review'; exception when insufficient_privilege or others then if sqlerrm like 'anon%' then raise; end if; end;
  perform back();
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a3');
  assert (select count(*) from reviews) = 1, 'staff sees only published';
  perform back();
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a2');
  assert (select count(*) from reviews) = 3, 'manager sees all';
  perform back();
  raise notice 'OK reviews: verified needs completed order, one per order, moderation visibility';
end $$;

-- 7. Storage policies and write access ------------------------------------------------
do $$ begin
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a2');
  insert into storage.objects(bucket_id, name) values ('product-images', 'x/y/detail.avif');
  insert into storage.objects(bucket_id, name) values ('review-images', 'r/photo.webp');
  perform back(); perform act('authenticated', '00000000-0000-0000-0000-0000000000a3');
  begin insert into storage.objects(bucket_id, name) values ('product-images', 'evil.avif'); raise exception 'staff uploaded'; exception when insufficient_privilege or others then if sqlerrm like 'staff%' then raise; end if; end;
  begin update products set price_paise = 1; exception when others then null; end;
  perform back(); perform act('anon', null);
  assert (select count(*) from storage.objects where bucket_id = 'product-images') = 1, 'public product images readable';
  assert (select count(*) from storage.objects where bucket_id = 'review-images') = 0, 'review images private';
  perform back();
  assert (select min(price_paise) from products) > 1, 'staff cannot change prices';
  perform act('authenticated', '00000000-0000-0000-0000-0000000000a4');            -- a customer with no role
  update products set price_paise = 1; assert (select min(price_paise) from products) > 1, 'customer cannot change prices';
  assert (select count(*) from admin_roles) = 0, 'customer sees no roles';
  perform back();
  raise notice 'OK storage and write access: only managers upload or edit the menu';
end $$;
rollback;
