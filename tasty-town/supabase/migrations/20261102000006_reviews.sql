alter table reviews
  add column client_ip_hash text,
  add column admin_created boolean not null default false;

create index reviews_status_idx on reviews(status, created_at desc);
-- One review per order per product (or one restaurant-level review per order).
create unique index reviews_one_per_order on reviews(order_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)) where order_id is not null;

-- A review can only be "verified" when its order really is completed.
create or replace function reviews_verify_check() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified and not exists (select 1 from orders where id = new.order_id and status = 'completed') then
    raise exception 'verified_requires_completed_order';
  end if;
  return new;
end $$;
create trigger reviews_verify before insert or update of is_verified, order_id on reviews
  for each row execute function reviews_verify_check();

-- Customer photos live in the private 'review-images' bucket (policies from migration 2); the site shows them through short-lived signed URLs, and only for published reviews.
