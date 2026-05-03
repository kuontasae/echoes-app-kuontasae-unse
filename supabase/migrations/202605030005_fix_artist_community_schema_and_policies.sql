create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists name text not null default '',
  add column if not exists handle text not null default '',
  add column if not exists avatar text not null default '/default-avatar.png',
  add column if not exists bio text not null default '',
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists "liveHistory" text[] not null default '{}',
  add column if not exists "topArtists" text[] not null default '{}',
  add column if not exists "isPrivate" boolean not null default false,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists "twitterUrl" text,
  add column if not exists "instagramUrl" text;

create table if not exists public.custom_communities (
  id text primary key,
  name text not null,
  date date not null,
  creator_id text,
  created_at timestamptz not null default now()
);

alter table public.custom_communities
  add column if not exists community_type text not null default 'live',
  add column if not exists artist_id text,
  add column if not exists artist_name text,
  add column if not exists description text,
  add column if not exists artwork_url text;

create unique index if not exists custom_communities_artist_id_unique
  on public.custom_communities (artist_id)
  where community_type = 'artist' and artist_id is not null;

create table if not exists public.community_members (
  community_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  target_id text not null,
  text text not null,
  is_read boolean not null default false,
  read_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.custom_communities enable row level security;
alter table public.community_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles for select
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid()::text = id::text);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid()::text = id::text)
  with check (auth.uid()::text = id::text);

drop policy if exists custom_communities_select_all on public.custom_communities;
drop policy if exists custom_communities_select_authenticated on public.custom_communities;
drop policy if exists custom_communities_insert_authenticated on public.custom_communities;
drop policy if exists custom_communities_update_creator_or_artist on public.custom_communities;
drop policy if exists custom_communities_update_authenticated on public.custom_communities;

create policy custom_communities_select_authenticated
  on public.custom_communities for select
  using (auth.uid() is not null);

create policy custom_communities_insert_authenticated
  on public.custom_communities for insert
  with check (auth.uid() is not null);

create policy custom_communities_update_authenticated
  on public.custom_communities for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists community_members_select_all on public.community_members;
drop policy if exists community_members_select_authenticated on public.community_members;
drop policy if exists community_members_insert_self on public.community_members;
drop policy if exists community_members_update_self on public.community_members;
drop policy if exists community_members_delete_self on public.community_members;

create policy community_members_select_authenticated
  on public.community_members for select
  using (auth.uid() is not null);

create policy community_members_insert_self
  on public.community_members for insert
  with check (auth.uid()::text = user_id::text);

create policy community_members_update_self
  on public.community_members for update
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);

create policy community_members_delete_self
  on public.community_members for delete
  using (auth.uid()::text = user_id::text);

drop policy if exists chat_messages_select_authenticated on public.chat_messages;
drop policy if exists chat_messages_insert_self on public.chat_messages;
drop policy if exists chat_messages_update_self_or_target_reader on public.chat_messages;
drop policy if exists chat_messages_delete_self on public.chat_messages;

create policy chat_messages_select_authenticated
  on public.chat_messages for select
  using (auth.uid() is not null);

create policy chat_messages_insert_self
  on public.chat_messages for insert
  with check (auth.uid()::text = sender_id::text);
