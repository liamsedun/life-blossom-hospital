-- Fix role-helper functions that were corrupted in the remote database.
-- The remote is_admin() was failing with "cannot cast type boolean to user_role",
-- which broke every RLS query that checks admin/staff status (organizations,
-- users, patients selects) for non-admin users — breaking patient login and
-- the admin portal's user fetch.
--
-- These recreate the canonical definitions from migration 0002
-- (20260904000002_hospital_full_schema.sql). `create or replace` is safe to
-- re-run.

-- ---------------------------------------------------------------------------
-- is_admin — checks BOTH the new users table and the legacy profiles table
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'::public.user_role
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- is_staff — admin/doctor/nurse/accountant/receptionist (both tables)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'doctor', 'receptionist', 'billing')
  ) or exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'doctor', 'nurse', 'accountant', 'receptionist')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- is_accounting — admin/accountant (new) or admin/billing (legacy profiles)
-- ---------------------------------------------------------------------------
create or replace function public.is_accounting()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'billing')
  ) or exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'accountant')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- user_org_id — the current user's organization
-- ---------------------------------------------------------------------------
create or replace function public.user_org_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select org_id from public.users where id = auth.uid());
end;
$$;