-- ============================================================
-- Add user_role enum + role column to profiles
-- ============================================================

-- 1. Create the role enum
create type public.user_role as enum ('admin', 'alumni', 'student', 'faculty');

-- 2. Add role column to profiles (default student for all existing rows)
alter table public.profiles
  add column role public.user_role not null default 'student';

-- -------------------------------------------------------
-- 3. Helper: is_admin()
--    Returns true if the calling user has role = 'admin'.
--    Marked security definer + stable so it can be used in RLS
--    without causing recursive policy evaluation.
-- -------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -------------------------------------------------------
-- 4. Updated RLS policies on profiles
-- -------------------------------------------------------

-- Drop the existing self-update policy so we can replace it
drop policy if exists "Users can update their own profile" on public.profiles;

-- Users can update their own profile, but cannot self-promote to admin
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent a non-admin from setting their own role to 'admin'
    and (
      role != 'admin'
      or public.is_admin()
    )
  );

-- Admins can update any profile (including changing role to admin)
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- -------------------------------------------------------
-- 5. Policies for other tables: admins can read everything
--    (existing "authenticated" policies already cover this,
--     but we add explicit admin delete policies where useful)
-- -------------------------------------------------------

-- Admins can delete any post
create policy "Admins can delete any post"
  on public.posts for delete
  using (public.is_admin());
