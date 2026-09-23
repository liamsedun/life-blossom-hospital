-- Restore the missing public.users row for the super-admin bootstrap account.
--
-- GET /api/auth/setup-super-admin created olalekan.edun@gmail.com in Supabase
-- Auth this morning, but its public.users insert failed because the route
-- hardcoded a wrong org id. Without a users row the account cannot be used
-- (no role for middleware / no profile for /api/auth/me).
--
-- The role-protection trigger is briefly disabled because this bootstrap
-- runs without an authenticated admin session (same pattern as seed.sql).

alter table public.users disable trigger protect_users_role;

insert into public.users (
  id, org_id, email, role, first_name, last_name, phone,
  password_hash, is_active, metadata
)
values (
  '06c1d0be-a079-4e82-94ad-d2c1f3dfc564',
  '00000000-0000-4000-8000-000000000001',
  'olalekan.edun@gmail.com',
  'admin',
  'Olalekan',
  'Edun',
  null,
  '',   -- password is managed by Supabase Auth
  true,
  '{}'::jsonb
)
on conflict (id) do nothing;

-- Keep the legacy profiles row in sync so is_admin() matches everywhere.
alter table public.profiles disable trigger protect_profile_role;
update public.profiles
set role = 'admin'
where id = '06c1d0be-a079-4e82-94ad-d2c1f3dfc564'
  and role is distinct from 'admin';
alter table public.profiles enable trigger protect_profile_role;

alter table public.users enable trigger protect_users_role;