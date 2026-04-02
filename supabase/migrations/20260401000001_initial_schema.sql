-- ============================================================
-- Central Connect — Full Schema Migration
-- ============================================================

-- -------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- -------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  full_name               text not null default '',
  graduation_year         integer,
  photo_url               text,
  title_company           text default '',
  location                text default '',
  headline                text default '',
  about                   text default '',
  hs_activities           text default '',
  is_mentor               boolean not null default false,
  open_to_opportunities   boolean not null default false,
  is_hiring               boolean not null default false,
  contact_email           text default '',
  contact_phone           text default '',
  linkedin_url            text default '',
  is_verified             boolean not null default false,
  engagement_points       integer not null default 0,
  privacy_contact_visible boolean not null default true,
  privacy_job_visible     boolean not null default true,
  privacy_status_visible  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, contact_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- 2. EDUCATION
-- -------------------------------------------------------
create type public.school_type as enum ('high_school', 'college');

create table public.education (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  school_type      public.school_type not null default 'college',
  institution_name text not null default '',
  degree           text default '',
  major            text default '',
  honors           text default '',
  grad_year        integer,
  website          text default '',
  created_at       timestamptz not null default now()
);

alter table public.education enable row level security;

create policy "Education viewable by authenticated users"
  on public.education for select using (auth.role() = 'authenticated');

create policy "Owner can manage education"
  on public.education for all using (auth.uid() = profile_id);

-- -------------------------------------------------------
-- 3. EXPERIENCE
-- -------------------------------------------------------
create table public.experience (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null default '',
  company     text not null default '',
  start_date  date,
  end_date    date,
  is_current  boolean not null default false,
  description text default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.experience enable row level security;

create policy "Experience viewable by authenticated users"
  on public.experience for select using (auth.role() = 'authenticated');

create policy "Owner can manage experience"
  on public.experience for all using (auth.uid() = profile_id);

-- -------------------------------------------------------
-- 4. SKILLS + ENDORSEMENTS
-- -------------------------------------------------------
create table public.skills (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, skill_name)
);

alter table public.skills enable row level security;

create policy "Skills viewable by authenticated users"
  on public.skills for select using (auth.role() = 'authenticated');

create policy "Owner can manage skills"
  on public.skills for all using (auth.uid() = profile_id);

create table public.skill_endorsements (
  skill_id    uuid not null references public.skills(id) on delete cascade,
  endorser_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (skill_id, endorser_id)
);

alter table public.skill_endorsements enable row level security;

create policy "Endorsements viewable by authenticated users"
  on public.skill_endorsements for select using (auth.role() = 'authenticated');

create policy "Authenticated users can endorse"
  on public.skill_endorsements for insert with check (auth.uid() = endorser_id);

create policy "Endorsers can remove their endorsement"
  on public.skill_endorsements for delete using (auth.uid() = endorser_id);

-- -------------------------------------------------------
-- 5. POSTS (home feed)
-- -------------------------------------------------------
create type public.post_type as enum ('update', 'article', 'photo', 'event');
create type public.visibility_type as enum ('public', 'alumni');

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  post_type  public.post_type not null default 'update',
  visibility public.visibility_type not null default 'alumni',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Posts viewable by authenticated users"
  on public.posts for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = author_id);

create policy "Authors can update their posts"
  on public.posts for update using (auth.uid() = author_id);

create policy "Authors can delete their posts"
  on public.posts for delete using (auth.uid() = author_id);

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------
-- 6. POST REACTIONS
-- -------------------------------------------------------
create table public.post_reactions (
  post_id       uuid not null references public.posts(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at    timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.post_reactions enable row level security;

create policy "Reactions viewable by authenticated users"
  on public.post_reactions for select using (auth.role() = 'authenticated');

create policy "Authenticated users can react"
  on public.post_reactions for insert with check (auth.uid() = profile_id);

create policy "Users can remove their own reactions"
  on public.post_reactions for delete using (auth.uid() = profile_id);

-- -------------------------------------------------------
-- 7. CONNECTIONS
-- -------------------------------------------------------
create type public.connection_status as enum ('pending', 'accepted', 'blocked');

create table public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status       public.connection_status not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (requester_id, recipient_id)
);

alter table public.connections enable row level security;

create policy "Connections viewable by participants"
  on public.connections for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Authenticated users can request connections"
  on public.connections for insert with check (auth.uid() = requester_id);

create policy "Participants can update connection"
  on public.connections for update
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Participants can delete connection"
  on public.connections for delete
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- -------------------------------------------------------
-- 8. MENTORSHIP MATCHES
-- -------------------------------------------------------
create type public.mentorship_status as enum ('pending', 'active', 'completed', 'declined');

create table public.mentorship_matches (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  mentee_id  uuid not null references public.profiles(id) on delete cascade,
  status     public.mentorship_status not null default 'pending',
  message    text default '',
  created_at timestamptz not null default now(),
  unique (mentor_id, mentee_id)
);

alter table public.mentorship_matches enable row level security;

create policy "Mentorship visible to participants"
  on public.mentorship_matches for select
  using (auth.uid() = mentor_id or auth.uid() = mentee_id);

create policy "Mentees can initiate mentorship requests"
  on public.mentorship_matches for insert with check (auth.uid() = mentee_id);

create policy "Participants can update mentorship status"
  on public.mentorship_matches for update
  using (auth.uid() = mentor_id or auth.uid() = mentee_id);

-- -------------------------------------------------------
-- 9. DIRECT MESSAGES
-- -------------------------------------------------------
create table public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.direct_messages enable row level security;

create policy "Messages visible to sender and recipient"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Authenticated users can send messages"
  on public.direct_messages for insert with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on public.direct_messages for update using (auth.uid() = recipient_id);

-- -------------------------------------------------------
-- 10. GROUP CHATS
-- -------------------------------------------------------
create type public.chat_type as enum ('industry', 'grad_year', 'club_sport', 'general');

create table public.group_chats (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  chat_type   public.chat_type not null default 'general',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.group_chats enable row level security;

create policy "Group chats viewable by authenticated users"
  on public.group_chats for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create group chats"
  on public.group_chats for insert with check (auth.uid() = created_by);

-- -------------------------------------------------------
-- 11. GROUP CHAT MEMBERS
-- -------------------------------------------------------
create table public.group_chat_members (
  chat_id    uuid not null references public.group_chats(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (chat_id, profile_id)
);

alter table public.group_chat_members enable row level security;

create policy "Members visible to authenticated users"
  on public.group_chat_members for select using (auth.role() = 'authenticated');

create policy "Users can join group chats"
  on public.group_chat_members for insert with check (auth.uid() = profile_id);

create policy "Users can leave group chats"
  on public.group_chat_members for delete using (auth.uid() = profile_id);

-- -------------------------------------------------------
-- 12. GROUP MESSAGES
-- -------------------------------------------------------
create table public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.group_chats(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.group_messages enable row level security;

create policy "Group messages visible to members"
  on public.group_messages for select
  using (
    exists (
      select 1 from public.group_chat_members
      where chat_id = group_messages.chat_id and profile_id = auth.uid()
    )
  );

create policy "Members can send group messages"
  on public.group_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.group_chat_members
      where chat_id = group_messages.chat_id and profile_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 13. OPPORTUNITIES BOARD
-- -------------------------------------------------------
create type public.opportunity_type as enum ('internship', 'full_time', 'part_time', 'networking_event', 'webinar');

create table public.opportunities (
  id          uuid primary key default gen_random_uuid(),
  posted_by   uuid not null references public.profiles(id) on delete cascade,
  type        public.opportunity_type not null,
  title       text not null,
  company     text not null default '',
  description text default '',
  location    text default '',
  is_remote   boolean not null default false,
  url         text default '',
  expires_at  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.opportunities enable row level security;

create policy "Opportunities viewable by authenticated users"
  on public.opportunities for select using (auth.role() = 'authenticated');

create policy "Authenticated users can post opportunities"
  on public.opportunities for insert with check (auth.uid() = posted_by);

create policy "Posters can update their opportunities"
  on public.opportunities for update using (auth.uid() = posted_by);

create policy "Posters can delete their opportunities"
  on public.opportunities for delete using (auth.uid() = posted_by);

create trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------
-- 14. EVENTS
-- -------------------------------------------------------
create type public.event_type as enum ('reunion', 'networking', 'fundraiser', 'webinar', 'other');

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  description      text default '',
  event_type       public.event_type not null default 'other',
  event_date       timestamptz not null,
  location         text default '',
  is_virtual       boolean not null default false,
  registration_url text default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Events viewable by authenticated users"
  on public.events for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create events"
  on public.events for insert with check (auth.uid() = created_by);

create policy "Creators can update events"
  on public.events for update using (auth.uid() = created_by);

create policy "Creators can delete events"
  on public.events for delete using (auth.uid() = created_by);

create trigger events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------
-- Engagement points helpers
-- -------------------------------------------------------
create or replace function public.increment_engagement(user_id uuid, points integer)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set engagement_points = engagement_points + points
  where id = user_id;
end;
$$;

create or replace function public.award_post_points()
returns trigger language plpgsql security definer as $$
begin
  perform public.increment_engagement(new.author_id, 10);
  return new;
end;
$$;

create trigger award_points_on_post
  after insert on public.posts
  for each row execute procedure public.award_post_points();

create or replace function public.award_mentorship_points()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'active' and old.status = 'pending' then
    perform public.increment_engagement(new.mentor_id, 25);
    perform public.increment_engagement(new.mentee_id, 10);
  end if;
  return new;
end;
$$;

create trigger award_points_on_mentorship
  after update on public.mentorship_matches
  for each row execute procedure public.award_mentorship_points();
