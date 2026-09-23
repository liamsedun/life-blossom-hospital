-- Add new staff roles to the user_role enum
-- Existing: admin, doctor, nurse, accountant, receptionist, patient
-- Adding:  cashier, lab_technician, pharmacist, radiographer, radiologist

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'radiographer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'radiologist';

-- Update is_staff() to include all staff roles that should have
-- patient-creation and general staff access.
-- Full list: admin, doctor, nurse, accountant, receptionist,
--            cashier, lab_technician, pharmacist, radiographer, radiologist
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'doctor', 'nurse', 'accountant', 'receptionist')
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN (
        'admin', 'doctor', 'nurse', 'accountant', 'receptionist',
        'cashier', 'lab_technician', 'pharmacist', 'radiographer', 'radiologist'
      )
  );
END;
$$;
