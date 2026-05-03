alter table public.profiles enable row level security;
alter table public.custom_communities enable row level security;
alter table public.community_members enable row level security;
alter table public.chat_messages enable row level security;

alter table public.custom_communities
  add column if not exists community_type text not null default 'live',
  add column if not exists artist_id text,
  add column if not exists artist_name text,
  add column if not exists description text,
  add column if not exists artwork_url text;

create unique index if not exists custom_communities_artist_id_unique
  on public.custom_communities (artist_id)
  where community_type = 'artist' and artist_id is not null;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles for select
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists custom_communities_select_all on public.custom_communities;
create policy custom_communities_select_all
  on public.custom_communities for select
  using (auth.uid() is not null);

drop policy if exists custom_communities_insert_authenticated on public.custom_communities;
create policy custom_communities_insert_authenticated
  on public.custom_communities for insert
  with check (auth.uid() is not null);

drop policy if exists custom_communities_update_authenticated on public.custom_communities;
create policy custom_communities_update_authenticated
  on public.custom_communities for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists community_members_select_authenticated on public.community_members;
create policy community_members_select_authenticated
  on public.community_members for select
  using (auth.uid() is not null);

drop policy if exists community_members_insert_self on public.community_members;
create policy community_members_insert_self
  on public.community_members for insert
  with check (auth.uid() = user_id);

drop policy if exists community_members_update_self on public.community_members;
create policy community_members_update_self
  on public.community_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists community_members_delete_self on public.community_members;
create policy community_members_delete_self
  on public.community_members for delete
  using (auth.uid() = user_id);

drop policy if exists chat_messages_select_authenticated on public.chat_messages;
create policy chat_messages_select_authenticated
  on public.chat_messages for select
  using (auth.uid() is not null);

drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self
  on public.chat_messages for insert
  with check (auth.uid() = sender_id);
