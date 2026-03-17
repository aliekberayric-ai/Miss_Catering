create table if not exists profiles (
  id uuid primary key,
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  customer_name text,
  customer_email text,
  package_slug text,
  persons integer,
  total_price numeric,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table orders enable row level security;

create policy "profile self read" on profiles
for select using (auth.uid() = id);

create policy "orders admin read" on orders
for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "orders insert any authenticated" on orders
for insert to authenticated with check (true);
