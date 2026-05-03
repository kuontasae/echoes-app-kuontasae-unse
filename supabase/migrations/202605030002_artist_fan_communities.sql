alter table public.custom_communities
  add column if not exists community_type text not null default 'live',
  add column if not exists artist_id text,
  add column if not exists artist_name text,
  add column if not exists description text,
  add column if not exists artwork_url text;

create unique index if not exists custom_communities_artist_id_unique
  on public.custom_communities (artist_id)
  where community_type = 'artist' and artist_id is not null;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  target_id text not null,
  text text not null,
  is_read boolean not null default false,
  read_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.custom_communities enable row level security;
alter table public.community_members enable row level security;
alter table public.chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'custom_communities' and policyname = 'custom_communities_select_all'
  ) then
    create policy custom_communities_select_all
      on public.custom_communities for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'custom_communities' and policyname = 'custom_communities_insert_authenticated'
  ) then
    create policy custom_communities_insert_authenticated
      on public.custom_communities for insert
      with check (auth.uid() is not null and (creator_id = auth.uid()::text or creator_id is null));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'custom_communities' and policyname = 'custom_communities_update_creator_or_artist'
  ) then
    create policy custom_communities_update_creator_or_artist
      on public.custom_communities for update
      using (auth.uid() is not null and (creator_id = auth.uid()::text or community_type = 'artist'))
      with check (auth.uid() is not null and (creator_id = auth.uid()::text or community_type = 'artist'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'community_members' and policyname = 'community_members_select_all'
  ) then
    create policy community_members_select_all
      on public.community_members for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'community_members' and policyname = 'community_members_insert_self'
  ) then
    create policy community_members_insert_self
      on public.community_members for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_select_authenticated'
  ) then
    create policy chat_messages_select_authenticated
      on public.chat_messages for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_insert_self'
  ) then
    create policy chat_messages_insert_self
      on public.chat_messages for insert
      with check (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_update_self_or_target_reader'
  ) then
    create policy chat_messages_update_self_or_target_reader
      on public.chat_messages for update
      using (auth.uid() is not null and (sender_id = auth.uid() or target_id = auth.uid()::text))
      with check (auth.uid() is not null and (sender_id = auth.uid() or target_id = auth.uid()::text));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_delete_self'
  ) then
    create policy chat_messages_delete_self
      on public.chat_messages for delete
      using (auth.uid() = sender_id);
  end if;
end $$;
