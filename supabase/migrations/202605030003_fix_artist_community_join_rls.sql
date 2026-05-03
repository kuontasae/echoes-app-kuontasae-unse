alter table public.custom_communities enable row level security;
alter table public.community_members enable row level security;
alter table public.group_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists custom_communities_select_all on public.custom_communities;
create policy custom_communities_select_all
  on public.custom_communities for select
  using (true);

drop policy if exists custom_communities_insert_authenticated on public.custom_communities;
create policy custom_communities_insert_authenticated
  on public.custom_communities for insert
  with check (
    auth.uid() is not null
    and (
      creator_id = auth.uid()::text
      or creator_id is null
      or community_type = 'artist'
    )
  );

drop policy if exists custom_communities_update_creator_or_artist on public.custom_communities;
create policy custom_communities_update_creator_or_artist
  on public.custom_communities for update
  using (
    auth.uid() is not null
    and (
      creator_id = auth.uid()::text
      or community_type = 'artist'
    )
  )
  with check (
    auth.uid() is not null
    and (
      creator_id = auth.uid()::text
      or creator_id is null
      or community_type = 'artist'
    )
  );

drop policy if exists community_members_select_all on public.community_members;
create policy community_members_select_all
  on public.community_members for select
  using (true);

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

drop policy if exists group_members_delete_self on public.group_members;
create policy group_members_delete_self
  on public.group_members for delete
  using (auth.uid() = user_id);

drop policy if exists chat_messages_select_authenticated on public.chat_messages;
create policy chat_messages_select_authenticated
  on public.chat_messages for select
  using (auth.uid() is not null);

drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self
  on public.chat_messages for insert
  with check (auth.uid() = sender_id);
