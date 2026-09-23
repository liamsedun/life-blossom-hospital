-- Add 'roles' module permissions for all existing roles
-- (was missing from the original seed in 20260913000004)
DO $$
DECLARE
  default_org uuid := '00000000-0000-4000-8000-000000000001';
BEGIN
  -- admin: full access to roles
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
  VALUES (default_org, 'admin', 'roles', true, true, true, true)
  ON CONFLICT (org_id, role, module) DO NOTHING;

  -- All other built-in roles: no access to roles (default false)
  -- No insert needed — rows don't exist, so can_view defaults to absent (hidden).
  -- If any role should have partial access, add INSERT here.
END $$;
