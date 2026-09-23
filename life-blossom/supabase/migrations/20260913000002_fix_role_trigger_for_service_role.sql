-- Fix protect_users_role trigger to allow the service_role key
-- to create users with any role (admin creating staff/patients).
-- Without this, svc.auth.admin.createUser + users.insert fails
-- because auth.uid() for service_role is not in the users table.

CREATE OR REPLACE FUNCTION public.protect_users_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow the service_role (Supabase admin key) to assign any role.
  -- It is not a real user in the users table, so is_admin() returns false.
  -- We detect it by checking if auth.uid() is null (service role context)
  -- or if the caller is an admin.
  IF new.role IS DISTINCT FROM 'patient'::public.user_role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign a role other than patient';
  END IF;
  RETURN new;
END;
$$;
