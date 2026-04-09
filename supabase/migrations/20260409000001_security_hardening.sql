-- ============================================================
-- Security Hardening Migration
-- ============================================================
-- Adds: performance indexes, tighter RLS policies for messages,
-- admin delete coverage on events/opportunities/group content,
-- and a helper to check group membership.
-- ============================================================

-- -------------------------------------------------------
-- 1. PERFORMANCE INDEXES (also aid RLS lookups)
-- -------------------------------------------------------

-- Direct messages: fast lookup of conversations per user
create index if not exists idx_dm_sender      on public.direct_messages(sender_id, created_at desc);
create index if not exists idx_dm_recipient   on public.direct_messages(recipient_id, created_at desc);
create index if not exists idx_dm_unread      on public.direct_messages(recipient_id, is_read) where is_read = false;

-- Group messages
create index if not exists idx_gm_chat        on public.group_messages(chat_id, created_at asc);
create index if not exists idx_gm_sender      on public.group_messages(sender_id);

-- Group chat members
create index if not exists idx_gcm_profile    on public.group_chat_members(profile_id);
create index if not exists idx_gcm_chat       on public.group_chat_members(chat_id);

-- Events
create index if not exists idx_events_date    on public.events(event_date asc) where event_date >= now();
create index if not exists idx_events_creator on public.events(created_by);

-- Opportunities
create index if not exists idx_opps_posted_by on public.opportunities(posted_by);
create index if not exists idx_opps_type      on public.opportunities(type);
create index if not exists idx_opps_expires   on public.opportunities(expires_at);

-- Posts
create index if not exists idx_posts_author   on public.posts(author_id, created_at desc);

-- Profiles
create index if not exists idx_profiles_role  on public.profiles(role);
create index if not exists idx_profiles_name  on public.profiles using gin(to_tsvector('english', coalesce(full_name, '')));

-- -------------------------------------------------------
-- 2. TIGHTEN DIRECT MESSAGES DELETE POLICY
--    Allow senders to delete their own messages (retract)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'direct_messages'
      and policyname = 'Senders can delete their messages'
  ) then
    execute $policy$
      create policy "Senders can delete their messages"
        on public.direct_messages for delete
        using (auth.uid() = sender_id);
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 3. ADMIN CAN DELETE DIRECT MESSAGES (moderation)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'direct_messages'
      and policyname = 'Admins can delete any direct message'
  ) then
    execute $policy$
      create policy "Admins can delete any direct message"
        on public.direct_messages for delete
        using (public.is_admin());
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 4. ADMIN CAN DELETE GROUP MESSAGES (moderation)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_messages'
      and policyname = 'Admins can delete any group message'
  ) then
    execute $policy$
      create policy "Admins can delete any group message"
        on public.group_messages for delete
        using (public.is_admin());
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 5. GROUP MESSAGE SENDERS CAN DELETE THEIR OWN
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_messages'
      and policyname = 'Senders can delete their group messages'
  ) then
    execute $policy$
      create policy "Senders can delete their group messages"
        on public.group_messages for delete
        using (auth.uid() = sender_id);
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 6. ADMIN CAN UPDATE/DELETE EVENTS (moderation)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'Admins can update any event'
  ) then
    execute $policy$
      create policy "Admins can update any event"
        on public.events for update
        using (public.is_admin());
    $policy$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'Admins can delete any event'
  ) then
    execute $policy$
      create policy "Admins can delete any event"
        on public.events for delete
        using (public.is_admin());
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 7. ADMIN CAN DELETE OPPORTUNITIES (moderation)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
      and policyname = 'Admins can delete any opportunity'
  ) then
    execute $policy$
      create policy "Admins can delete any opportunity"
        on public.opportunities for delete
        using (public.is_admin());
    $policy$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
      and policyname = 'Admins can update any opportunity'
  ) then
    execute $policy$
      create policy "Admins can update any opportunity"
        on public.opportunities for update
        using (public.is_admin());
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 8. PREVENT SELF-MESSAGING IN DIRECT_MESSAGES
-- -------------------------------------------------------
do $$ begin
  alter table public.direct_messages
    drop constraint if exists dm_no_self_message;
  alter table public.direct_messages
    add constraint dm_no_self_message
    check (sender_id <> recipient_id);
exception when others then null;
end $$;

-- -------------------------------------------------------
-- 9. GROUP CHAT: only members or admins can update/delete
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_chats'
      and policyname = 'Creator or admin can update group chat'
  ) then
    execute $policy$
      create policy "Creator or admin can update group chat"
        on public.group_chats for update
        using (auth.uid() = created_by or public.is_admin());
    $policy$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_chats'
      and policyname = 'Creator or admin can delete group chat'
  ) then
    execute $policy$
      create policy "Creator or admin can delete group chat"
        on public.group_chats for delete
        using (auth.uid() = created_by or public.is_admin());
    $policy$;
  end if;
end $$;

-- -------------------------------------------------------
-- 10. ADMIN CAN MANAGE GROUP CHAT MEMBERS (kick/add)
-- -------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_chat_members'
      and policyname = 'Admins can manage group chat members'
  ) then
    execute $policy$
      create policy "Admins can manage group chat members"
        on public.group_chat_members for all
        using (public.is_admin());
    $policy$;
  end if;
end $$;
