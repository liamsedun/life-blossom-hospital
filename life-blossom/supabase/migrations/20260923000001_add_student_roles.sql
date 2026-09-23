-- Add view-only student roles to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student_staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student_patient';

-- Update is_staff() so RLS recognizes student_staff as staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN (
        'admin', 'doctor', 'nurse', 'accountant', 'receptionist',
        'cashier', 'lab_technician', 'pharmacist', 'radiographer', 'radiologist',
        'student_staff'
      )
  );
END;
$$;

-- Seed role_permissions for student_staff: CAN view everything, CANNOT create/edit/delete
DO $$
DECLARE
  default_org uuid := '00000000-0000-4000-8000-000000000001';
  m text;
BEGIN
  FOR m IN SELECT unnest(ARRAY[
    'dashboard','patients','appointments','billing','expenses','other_income',
    'internal_mail','live_chat','staff','reports','security_audit','settings','profile'
  ]) LOOP
    INSERT INTO public.role_permissions (org_id, role, module, can_view, can_create, can_edit, can_delete)
    VALUES (default_org, 'student_staff', m, true, false, false, false)
    ON CONFLICT (org_id, role, module) DO NOTHING;
  END LOOP;
END $$;
