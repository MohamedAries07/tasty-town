-- Media pipeline: variants, totals, uploader, and non-product assets.
alter table product_images
  add column variants jsonb not null default '{}',   -- {"detail":path,"card":path,"thumb":path}
  add column total_bytes int not null default 0,     -- sum of all stored variants
  add column uploaded_by uuid references auth.users(id) on delete set null;

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  entity text not null check (entity in ('banner','category','asset')),
  entity_id uuid,
  variants jsonb not null default '{}',
  image_format text not null,
  width int not null,
  height int not null,
  file_size_bytes int not null,
  total_bytes int not null,
  original_size_bytes int,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table media_assets enable row level security;
create policy "manager all media_assets" on media_assets for all using (is_manager()) with check (is_manager());
