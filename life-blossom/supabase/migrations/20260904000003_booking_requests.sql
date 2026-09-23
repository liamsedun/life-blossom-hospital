-- =====================================================================
-- Migration 0003 — public booking requests (landing-page "Book an
-- Appointment" form).
-- ---------------------------------------------------------------------
-- Visitors who are NOT logged in submit a booking request from the
-- website (name, phone, department, preferred date). These land in a
-- dedicated `booking_requests` table; staff review them and later
-- convert them into real `appointments` (which need a patient + doctor
-- and so can never be created by the public).
--
-- Idempotent: the function/table/indexes use IF NOT EXISTS / OR REPLACE,
-- and the trigger is dropped before being recreated. Policies are plain
-- CREATE POLICY (same convention as migration 0002 — a migration runs
-- exactly once).
-- =====================================================================

-- Resolves the hospital's organization id server-side, so the public
-- never needs to know it — and can never choose a different org.
create or replace function public.current_org_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    select id from public.organizations
    where is_active
    order by created_at
    limit 1
  );
end;
$$;

create table if not exists public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default public.current_org_id()
                 references public.organizations (id) on delete cascade,
  name           text not null,
  phone          text not null,
  department     text not null,
  preferred_date date not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'contacted', 'confirmed', 'cancelled')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists booking_requests_org_status_idx on public.booking_requests (org_id, status);
create index if not exists booking_requests_org_date_idx  on public.booking_requests (org_id, preferred_date);

drop trigger if exists trg_booking_requests_updated_at on public.booking_requests;
create trigger trg_booking_requests_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();

alter table public.booking_requests enable row level security;

-- Anyone (signed out or signed in) may submit a request. The row must
-- belong to the hospital's org, start as 'pending', and not be
-- backdated. Nobody can READ requests anonymously.
create policy "booking_requests_anon_insert" on public.booking_requests
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and preferred_date >= current_date
    and org_id = public.current_org_id()
  );

-- Staff may view and update requests for their own organization only.
create policy "booking_requests_staff_select" on public.booking_requests
  for select to authenticated
  using (public.is_staff() and org_id = public.user_org_id());

create policy "booking_requests_staff_update" on public.booking_requests
  for update to authenticated
  using (public.is_staff() and org_id = public.user_org_id())
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "booking_requests_admin_delete" on public.booking_requests
  for delete to authenticated
  using (public.is_admin());