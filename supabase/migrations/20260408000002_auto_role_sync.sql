-- ============================================================
-- Auto-sync role from graduation_year + tighten role RLS
-- ============================================================

-- -------------------------------------------------------
-- 1. SQL helper: compute the correct role from a grad year
--    Transition date: May 20 each year.
--    Before May 20 of year Y → senior year = Y
--    On/after May 20 of year Y → senior year = Y+1
-- -------------------------------------------------------
create or replace function public.compute_role_from_grad_year(p_grad_year integer)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_grad_year is null then 'student'::public.user_role
    when p_grad_year >= (
      case
        when extract(month from now()) > 5
          or (extract(month from now()) = 5 and extract(day from now()) >= 20)
        then extract(year from now())::int + 1
        else extract(year from now())::int
      end
    ) then 'student'::public.user_role
    else 'alumni'::public.user_role
  end
$$;

-- -------------------------------------------------------
-- 2. Trigger function: auto-assign role on insert or
--    whenever graduation_year is updated.
--    Admin and faculty roles are never auto-overwritten.
-- -------------------------------------------------------
create or replace function public.trg_sync_role_from_grad_year()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Preserve admin / faculty — these are only set by admins
  if new.role in ('admin', 'faculty') then
    return new;
  end if;

  -- Compute and assign role from graduation_year
  new.role := public.compute_role_from_grad_year(new.graduation_year);
  return new;
end;
$$;

drop trigger if exists trg_sync_role_from_grad_year on public.profiles;

create trigger trg_sync_role_from_grad_year
  before insert or update of graduation_year
  on public.profiles
  for each row
  execute function public.trg_sync_role_from_grad_year();

-- -------------------------------------------------------
-- 3. Tighten RLS: users can update their own profile, but
--    the stored role must always equal the auto-computed
--    value for their graduation_year (or remain unchanged
--    when the role is admin/faculty).
--    Admins are unrestricted.
-- -------------------------------------------------------
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      -- Admins can set any role
      public.is_admin()
      or (
        -- Non-admins: role must be the value auto-computed from graduation_year
        --   (the BEFORE trigger will already have set this, so this check just
        --    prevents clients from supplying a different role directly)
        role = public.compute_role_from_grad_year(graduation_year)
        -- OR the user's role is admin/faculty and they are not changing it
        -- (so admin/faculty can still edit name, headline, etc.)
        or (
          role in ('admin', 'faculty')
          and role = (select p.role from public.profiles p where p.id = auth.uid())
        )
      )
    )
  );
