alter table public.chat_messages enable row level security;

create or replace function public.can_read_chat_target(p_target_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      p_target_id = auth.uid()::text
      or exists (
        select 1
        from public.group_members gm
        where gm.group_id = p_target_id
          and gm.user_id::text = auth.uid()::text
      )
      or exists (
        select 1
        from public.community_members cm
        where cm.community_id = p_target_id
          and cm.user_id::text = auth.uid()::text
      )
    );
$$;

create or replace function public.can_send_chat_target(p_target_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.profiles p
        where p.id::text = p_target_id
      )
      or exists (
        select 1
        from public.group_members gm
        where gm.group_id = p_target_id
          and gm.user_id::text = auth.uid()::text
      )
      or exists (
        select 1
        from public.community_members cm
        where cm.community_id = p_target_id
          and cm.user_id::text = auth.uid()::text
      )
    );
$$;

drop policy if exists chat_messages_select_authenticated on public.chat_messages;
drop policy if exists chat_messages_select_participants on public.chat_messages;
create policy chat_messages_select_participants
  on public.chat_messages
  for select
  using (
    auth.uid() is not null
    and (
      sender_id::text = auth.uid()::text
      or public.can_read_chat_target(target_id)
    )
  );

drop policy if exists chat_messages_insert_self on public.chat_messages;
drop policy if exists chat_messages_insert_participants on public.chat_messages;
create policy chat_messages_insert_participants
  on public.chat_messages
  for insert
  with check (
    sender_id::text = auth.uid()::text
    and public.can_send_chat_target(target_id)
  );

drop policy if exists chat_messages_update_self_or_target_reader on public.chat_messages;

drop policy if exists chat_messages_delete_self on public.chat_messages;
create policy chat_messages_delete_self
  on public.chat_messages
  for delete
  using (sender_id::text = auth.uid()::text);
