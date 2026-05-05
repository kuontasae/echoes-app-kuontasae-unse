create table if not exists public.artist_favorites (
  user_id uuid not null,
  artist_id text not null,
  artist_name text not null,
  artwork_url text,
  created_at timestamptz not null default now()
);

alter table public.artist_favorites
  add column if not exists user_id uuid,
  add column if not exists artist_id text,
  add column if not exists artist_name text,
  add column if not exists artwork_url text,
  add column if not exists created_at timestamptz not null default now();

alter table public.artist_favorites enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.artist_favorites to authenticated;

create unique index if not exists artist_favorites_user_artist_unique
  on public.artist_favorites (user_id, artist_id);

create index if not exists artist_favorites_artist_id_idx
  on public.artist_favorites (artist_id);

drop policy if exists artist_favorites_select_authenticated on public.artist_favorites;
drop policy if exists artist_favorites_insert_self on public.artist_favorites;
drop policy if exists artist_favorites_update_self on public.artist_favorites;
drop policy if exists artist_favorites_delete_self on public.artist_favorites;

create policy artist_favorites_select_authenticated
  on public.artist_favorites for select
  to authenticated
  using (auth.uid() is not null);

create policy artist_favorites_insert_self
  on public.artist_favorites for insert
  to authenticated
  with check (auth.uid()::text = user_id::text);

create policy artist_favorites_update_self
  on public.artist_favorites for update
  to authenticated
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);

create policy artist_favorites_delete_self
  on public.artist_favorites for delete
  to authenticated
  using (auth.uid()::text = user_id::text);
