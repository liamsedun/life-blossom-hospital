-- Migration 0001 — roles, departments, profiles (users)
-- Schema source: Architecture.md §4.1–4.2 & §5; Architecture-essential.md §2.1
--
-- Notes:
--   * "Roles" are enforced as a CHECK constraint on profiles.role
--     (there is no standalone roles table — see Architecture.md §4.1).
--   * Roles are assigned by admins only, server-side. A trigger blocks any
--     non-admin from changing a role (no privilege escalation).
--   * RLS is enabled on every table from the first migration, with policies
--     matching the matrix in Architecture.md §5.

-- =====================================================================
-- departments
-- =====================================================================
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default true, -- soft delete; history must not break
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- profiles — one row per user, 1:1 with auth.users
-- =====================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  role       text not null default 'patient'
             check (role in ('admin', 'doctor', 'receptionist', 'billing', 'patient')),
  phone      text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Auto-create a profile row when a user signs up via Supabase Auth.
-- Staff accounts are created by an admin via the Auth Admin API; the admin
-- then updates the role (only admins may change roles — see trigger below).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Role helpers (security definer: they bypass RLS so policies can use them)
-- =====================================================================
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

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'doctor', 'receptionist', 'billing')
  );
$$;

-- Block any non-admin from changing a role (defense in depth — RLS already
-- limits writes to admins, but this also protects future self-edit paths).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change a user''s role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update of role on public.profiles
  for each row execute function public.protect_profile_role();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.departments enable row level security;
alter table public.profiles enable row level security;

-- departments: any signed-in user can read; only admins can write.
create policy "departments_select_authenticated" on public.departments
  for select to authenticated
  using (true);

create policy "departments_admin_write" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: everyone reads their own row; staff can read all; only admins
-- can update (role assignment happens through an admin-only flow).
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_staff" on public.profiles
  for select to authenticated
  using (public.is_staff());

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());