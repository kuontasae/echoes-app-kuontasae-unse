create table if not exists public.artist_profiles (
  artist_key text primary key,
  artist_id text,
  artist_name text not null,
  image_url text,
  image_source text,
  fallback_artwork_url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.artist_profiles enable row level security;

drop policy if exists artist_profiles_select_authenticated on public.artist_profiles;

create policy artist_profiles_select_authenticated
  on public.artist_profiles for select
  using (auth.uid() is not null);

create index if not exists artist_profiles_artist_id_idx
  on public.artist_profiles (artist_id);

create index if not exists artist_profiles_artist_name_idx
  on public.artist_profiles (artist_name);
