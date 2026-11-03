-- TASTY TOWN: core schema. Money is stored as integer paise (₹1 = 100 paise).
create extension if not exists pgcrypto;

create type food_type as enum ('veg', 'non_veg', 'egg');
create type order_type as enum ('delivery', 'takeaway');
create type order_status as enum (
  'pending_whatsapp', 'received', 'confirmed', 'preparing',
  'ready', 'out_for_delivery', 'completed', 'cancelled');
create type payment_method as enum ('cash_on_delivery', 'pay_at_pickup', 'upi');
create type payment_status as enum ('unpaid', 'paid', 'refunded');
create type admin_role as enum ('super_admin', 'manager', 'staff');
create type review_status as enum ('pending', 'published', 'rejected');
create type discount_type as enum ('fixed', 'percentage');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Identity ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  saved_addresses jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role admin_role not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Catalogue --------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  image_path text,
  display_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_paise int not null check (price_paise >= 0),
  food_type food_type not null,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  is_archived boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products(category_id) where not is_archived;

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null unique,
  image_format text not null,
  width int not null,
  height int not null,
  file_size_bytes int not null,
  original_size_bytes int,
  is_primary boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index product_images_one_primary on product_images(product_id) where is_primary;

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  price_delta_paise int not null default 0,
  is_default boolean not null default false,
  is_available boolean not null default true,
  display_order int not null default 0
);

create table product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  price_paise int not null check (price_paise >= 0),
  is_available boolean not null default true,
  display_order int not null default 0
);

-- Offers -----------------------------------------------------------------
create table offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  coupon_code text unique,
  discount_type discount_type not null,
  discount_value int not null check (discount_value > 0),
  min_order_paise int not null default 0,
  max_discount_paise int,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  priority int not null default 0,
  usage_limit int,
  usage_count int not null default 0,
  banner_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100)
);
create table offer_products (
  offer_id uuid references offers(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  primary key (offer_id, product_id)
);
create table offer_categories (
  offer_id uuid references offers(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (offer_id, category_id)
);

-- Orders -----------------------------------------------------------------
create sequence order_ref_seq;
create or replace function gen_order_reference() returns text language sql as $$
  select 'TT' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
         || '-' || lpad((nextval('order_ref_seq') % 10000)::text, 4, '0');
$$;

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default gen_order_reference(),
  receipt_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  idempotency_key text unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  order_type order_type not null,
  address jsonb,
  subtotal_paise int not null check (subtotal_paise >= 0),
  discount_paise int not null default 0 check (discount_paise >= 0),
  delivery_fee_paise int not null default 0 check (delivery_fee_paise >= 0),
  total_paise int not null check (total_paise >= 0),
  offer_id uuid references offers(id) on delete set null,
  offer_snapshot jsonb,
  status order_status not null default 'pending_whatsapp',
  payment_method payment_method not null,
  payment_status payment_status not null default 'unpaid',
  special_instructions text,
  internal_notes text,
  whatsapp_handoff_at timestamptz,
  customer_confirmed_sent_at timestamptz,
  restaurant_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_type <> 'delivery' or address is not null),
  check (total_paise = subtotal_paise - discount_paise + delivery_fee_paise)
);
create index orders_created_idx on orders(created_at desc);
create index orders_status_idx on orders(status);
create index orders_phone_idx on orders(customer_phone);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  category_name text,
  quantity int not null check (quantity > 0),
  unit_price_paise int not null check (unit_price_paise >= 0),
  selected_options jsonb not null default '{}',
  line_total_paise int not null check (line_total_paise >= 0)
);
create index order_items_order_idx on order_items(order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create or replace function log_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into order_status_history(order_id, from_status, to_status) values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into order_status_history(order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger orders_status_log after insert or update of status on orders
  for each row execute function log_order_status();

-- Settings, hours, delivery, banners, reviews, audit ----------------------
create table store_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table store_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint check (day_of_week between 0 and 6), -- 0 = Sunday
  special_date date,                                        -- holiday / override
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  check ((day_of_week is null) <> (special_date is null))
);
create unique index store_hours_dow_idx on store_hours(day_of_week) where day_of_week is not null;
create unique index store_hours_date_idx on store_hours(special_date) where special_date is not null;

create table delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee_paise int not null check (fee_paise >= 0),
  min_order_paise int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_path text,
  link_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review_title text,
  review_text text,
  image_paths text[] not null default '{}',
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  status review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_verified or order_id is not null)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','categories','products','offers','orders','reviews','store_settings'] loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
