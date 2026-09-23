-- role_permissions: granular per-module access control for each role
-- Modules match the sidebar nav items.
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role        text NOT NULL,
  module      text NOT NULL,
  can_view    boolean NOT NULL DEFAULT false,
  can_create  boolean NOT NULL DEFAULT false,
  can_edit    boolean NOT NULL DEFAULT false,
  can_delete  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, role, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_org_role ON public.role_permissions(org_id, role);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_all" ON public.role_permissions FOR ALL USING (true);

-- custom_roles: lets the admin create new role types beyond the built-in enum
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles_all" ON public.custom_roles FOR ALL USING (true);

-- Seed default permissions for built-in roles (org_id = the default org)
-- Modules: dashboard, patients, appointments, billing, expenses, other_income,
--          internal_mail, live_chat, staff, reports, security_audit, settings, profile
DO $$
DECLARE
  default_org uuid := '00000000-0000-4000-8000-000000000001';
  r text;
  m text;
BEGIN
  -- For each built-in role, insert permissions for each module
  -- admin: full access to everything
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','billing','expenses','other_income','internal_mail','live_chat','staff','reports','security_audit','settings','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'admin', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;

  -- doctor: full clinical, limited admin
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'doctor', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'doctor', 'billing', true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'doctor', 'reports', true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;

  -- nurse: similar to doctor
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'nurse', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'nurse', 'billing', true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;

  -- accountant: billing, expenses, other income, reports
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','billing','expenses','other_income','internal_mail','live_chat','reports','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'accountant', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;

  -- cashier: billing + limited
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','billing','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'cashier', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;

  -- receptionist: patients, appointments, limited
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','appointments','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'receptionist', m, true, true, true, true)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;

  -- lab_technician: patients (read), reports
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'lab_technician', m, true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'lab_technician', 'reports', true, true, true, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;

  -- pharmacist: patients (read), billing (read)
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','billing','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'pharmacist', m, true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;

  -- radiographer: patients (read), reports
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'radiographer', m, true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'radiographer', 'reports', true, true, true, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;

  -- radiologist: patients (read), reports (full)
  FOR m IN SELECT unnest(ARRAY['dashboard','patients','internal_mail','live_chat','profile']) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'radiologist', m, true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
  INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'radiologist', 'reports', true, true, true, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
END $$;
