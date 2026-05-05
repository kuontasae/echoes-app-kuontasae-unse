create table if not exists public.artist_favorites (
  user_id uuid not null,
  artist_id text not null,
  artist_name text not null,
  artwork_url text,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

alter table public.artist_favorites enable row level security;

drop policy if exists artist_favorites_select_authenticated on public.artist_favorites;
drop policy if exists artist_favorites_insert_self on public.artist_favorites;
drop policy if exists artist_favorites_update_self on public.artist_favorites;
drop policy if exists artist_favorites_delete_self on public.artist_favorites;

create policy artist_favorites_select_authenticated
  on public.artist_favorites for select
  using (auth.uid() is not null);

create policy artist_favorites_insert_self
  on public.artist_favorites for insert
  with check (auth.uid()::text = user_id::text);

create policy artist_favorites_update_self
  on public.artist_favorites for update
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);

create policy artist_favorites_delete_self
  on public.artist_favorites for delete
  using (auth.uid()::text = user_id::text);

create index if not exists artist_favorites_artist_id_idx
  on public.artist_favorites (artist_id);
