-- Migration 0001_add_resolve_login_email
-- Creates a security definer function that resolves a login identifier
-- (email, phone, employee_code, or patient_number) to the user's email
-- address. This is callable by anonymous users via Supabase RPC, which
-- lets the client resolve identifiers before calling signInWithPassword.
--
-- SECURITY: The function only returns the email (not the full user record)
-- and only for users who exist in the system. It is marked SECURITY
-- DEFINER so it can read across tables that have restrictive RLS.

create or replace function public.resolve_login_email(
  p_identifier text,
  p_user_type  text  -- 'staff' or 'patient'
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Normalise the identifier: trim whitespace, lowercase for email comparison.
  p_identifier := trim(p_identifier);

  if p_user_type = 'staff' then
    -- Try to find by employee_code in the staff table
    select u.email into v_email
    from public.staff s
    join public.users u on u.id = s.user_id
    where lower(s.employee_code) = lower(p_identifier)
      and s.is_active = true
      and u.is_active = true
    limit 1;

    -- If not found by employee_code, try phone
    if v_email is null then
      select u.email into v_email
      from public.users u
      where u.phone = p_identifier
        and u.role in ('admin', 'doctor', 'nurse', 'accountant', 'receptionist')
        and u.is_active = true
      limit 1;
    end if;

  elsif p_user_type = 'patient' then
    -- Try to find by patient_number in the patients table
    select u.email into v_email
    from public.patients p
    join public.users u on u.id = p.user_id
    where lower(p.patient_number) = lower(p_identifier)
      and p.is_active = true
      and u.is_active = true
    limit 1;

    -- If not found by patient_number, try phone
    if v_email is null then
      select u.email into v_email
      from public.users u
      where u.phone = p_identifier
        and u.role = 'patient'
        and u.is_active = true
      limit 1;
    end if;

  else
    return null;
  end if;

  return v_email;
end;
$$;

-- Allow anonymous (unauthenticated) callers to invoke this function.
-- The function itself is SECURITY DEFINER so it can read the tables,
-- but the RPC invocation still needs to be permitted by RLS / grants.
grant execute on function public.resolve_login_email(text, text) to anon;
grant execute on function public.resolve_login_email(text, text) to authenticated;
