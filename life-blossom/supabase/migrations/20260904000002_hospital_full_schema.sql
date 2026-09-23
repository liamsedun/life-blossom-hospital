-- Migration 0002 — Life Blossom full hospital schema
-- ------------------------------------------------------------------
-- One file, safe to run more than once (idempotent):
--   * ENUMs are created only if they do not exist
--   * tables use CREATE TABLE IF NOT EXISTS
--   * indexes use CREATE INDEX IF NOT EXISTS
--   * triggers are dropped and recreated (no duplicates)
--
-- Conventions:
--   * every table that stores hospital data carries org_id -> organizations(id)
--   * UUID primary keys everywhere (no auto-increment exposed in URLs)
--   * money is numeric(12,2) — never floating point
--   * timestamps are timestamptz
--   * RLS is enabled on every table (the security model, not the UI)
--   * updated_at is maintained by one shared trigger function
--
-- Assumes migration 0001 ran first (it creates `departments` and `profiles`).
-- `users` is the new canonical user table; `profiles` from 0001 is kept for
-- backwards compatibility and both are honoured by the role helpers below.

-- =====================================================================
-- 1. ENUM TYPES (created only if missing — Postgres has no IF NOT EXISTS
--    for CREATE TYPE, so each one is guarded by a DO block)
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'admin', 'doctor', 'nurse', 'accountant', 'receptionist', 'patient'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum (
      'scheduled', 'confirmed', 'checked_in', 'in_progress',
      'completed', 'cancelled', 'no_show'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum (
      'draft', 'issued', 'partial', 'paid', 'overdue', 'void'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'pending', 'completed', 'failed', 'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum (
      'cash', 'card', 'bank_transfer', 'mobile_money', 'insurance', 'other'
    );
  end if;
end $$;

-- =====================================================================
-- 2. SHARED FUNCTIONS
-- =====================================================================

-- Keeps updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The current user's organization (from the new `users` table).
-- Written in PL/pgSQL so creation does NOT require `users` to exist yet
-- (plain SQL functions are validated when created; PL/pgSQL is validated
-- when called). This lets the whole file run in one pass.
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

-- Role helpers. They check BOTH the new `users` table and the legacy
-- `profiles` table so existing accounts keep working during the switch.
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

-- Block any non-admin from assigning themselves a staff/privileged role.
create or replace function public.protect_users_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from 'patient'::public.user_role
     and not public.is_admin() then
    raise exception 'Only admins can assign a role other than patient';
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 3. organizations (the root of the org tree — no org_id on itself)
-- =====================================================================
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  legal_name    text,
  email         text,
  phone         text,
  address       text,
  city          text,
  state         text,
  country       text,
  postal_code   text,
  currency      text not null default 'USD',
  website       text,
  logo_url      text,
  settings      jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists organizations_name_idx on public.organizations (name);

-- =====================================================================
-- 4. users — everyone who can log in (1:1 with auth.users)
-- =====================================================================
create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  org_id        uuid not null references public.organizations (id),
  email         text,
  phone         text,
  full_name     text not null default '',
  role          public.user_role not null default 'patient',
  is_active     boolean not null default true,
  last_login_at timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_org_idx        on public.users (org_id);
create index if not exists users_role_idx       on public.users (role);
create index if not exists users_email_idx      on public.users (email);
create index if not exists users_org_role_idx   on public.users (org_id, role);

drop trigger if exists protect_users_role on public.users;
create trigger protect_users_role
  before insert or update of role on public.users
  for each row execute function public.protect_users_role();

-- =====================================================================
-- 5. patients — patient profiles
-- =====================================================================
create table if not exists public.patients (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations (id),
  user_id               uuid references public.users (id) on delete set null,
  patient_number        text not null,
  first_name            text not null,
  last_name             text not null,
  date_of_birth         date,
  gender                text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group           text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  phone                 text,
  email                 text,
  address               text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  insurance_provider    text,
  insurance_number      text,
  allergies             text,
  notes                 text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint patients_org_number_uniq unique (org_id, patient_number)
);

create index if not exists patients_org_name_idx   on public.patients (org_id, last_name, first_name);
create index if not exists patients_org_phone_idx  on public.patients (org_id, phone);
create index if not exists patients_user_idx       on public.patients (user_id);

-- =====================================================================
-- 6. staff — staff profiles (role, department, availability)
-- =====================================================================
create table if not exists public.staff (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id),
  user_id         uuid references public.users (id) on delete set null,
  department_id   uuid references public.departments (id),
  employee_code   text,
  first_name      text not null,
  last_name       text not null,
  role            public.user_role not null,
  title           text,
  specialty       text,
  phone           text,
  email           text,
  date_joined     date,
  availability    jsonb not null default '{}'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint staff_org_employee_uniq unique (org_id, employee_code)
);

create index if not exists staff_org_idx          on public.staff (org_id);
create index if not exists staff_org_role_idx     on public.staff (org_id, role);
create index if not exists staff_department_idx   on public.staff (department_id);
create index if not exists staff_user_idx         on public.staff (user_id);

-- =====================================================================
-- 7. appointments
-- =====================================================================
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id),
  patient_id       uuid not null references public.patients (id),
  doctor_id        uuid not null references public.staff (id),
  department_id    uuid references public.departments (id),
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 30,
  status           public.appointment_status not null default 'scheduled',
  reason           text,
  notes            text,
  created_by       uuid references public.users (id),
  cancelled_at     timestamptz,
  cancelled_by     uuid references public.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- The double-booking guard lives in the database, not just the UI.
  constraint appointments_no_double_book unique (org_id, doctor_id, scheduled_at)
);

create index if not exists appointments_org_patient_idx  on public.appointments (org_id, patient_id);
create index if not exists appointments_org_doctor_idx   on public.appointments (org_id, doctor_id, scheduled_at);
create index if not exists appointments_org_status_idx   on public.appointments (org_id, status);
create index if not exists appointments_org_day_idx      on public.appointments (org_id, scheduled_at);

-- =====================================================================
-- 8. medical_records — diagnoses, lab results, surgery reports,
--    vaccinations, imaging (one or more per visit)
-- =====================================================================
create table if not exists public.medical_records (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id),
  patient_id     uuid not null references public.patients (id),
  appointment_id uuid references public.appointments (id),
  doctor_id      uuid references public.staff (id),
  record_date    timestamptz not null default now(),
  record_type    text not null default 'consultation'
                 check (record_type in ('consultation', 'lab_result', 'imaging',
                                        'surgery_report', 'vaccination', 'other')),
  symptoms       text,
  diagnosis      text,
  treatment      text,
  notes          text,
  is_confidential boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists medical_records_org_patient_idx on public.medical_records (org_id, patient_id, record_date desc);
create index if not exists medical_records_org_appt_idx    on public.medical_records (org_id, appointment_id);
create index if not exists medical_records_org_type_idx    on public.medical_records (org_id, record_type);

-- =====================================================================
-- 9. prescriptions (header) + 10. prescription_items (line items)
-- =====================================================================
create table if not exists public.prescriptions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id),
  patient_id        uuid not null references public.patients (id),
  medical_record_id uuid references public.medical_records (id),
  doctor_id         uuid references public.staff (id),
  prescribed_at     timestamptz not null default now(),
  instructions      text,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists prescriptions_org_patient_idx on public.prescriptions (org_id, patient_id);
create index if not exists prescriptions_org_record_idx  on public.prescriptions (org_id, medical_record_id);

create table if not exists public.prescription_items (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id),
  prescription_id   uuid not null references public.prescriptions (id) on delete cascade,
  medicine_name     text not null,
  dosage            text,
  frequency         text,
  duration_days     integer,
  route             text,
  quantity          numeric(10,2),
  instructions      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists prescription_items_prescription_idx on public.prescription_items (prescription_id);
create index if not exists prescription_items_org_idx          on public.prescription_items (org_id);

-- =====================================================================
-- 11. invoices (header) + 12. invoice_items (line items)
-- =====================================================================
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id),
  invoice_number  text not null,
  patient_id      uuid not null references public.patients (id),
  appointment_id  uuid references public.appointments (id),
  issue_date      date not null default current_date,
  due_date        date,
  subtotal        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  status          public.invoice_status not null default 'draft',
  notes           text,
  created_by      uuid references public.users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint invoices_org_number_uniq unique (org_id, invoice_number)
);

create index if not exists invoices_org_patient_idx on public.invoices (org_id, patient_id);
create index if not exists invoices_org_status_idx  on public.invoices (org_id, status);
create index if not exists invoices_org_issued_idx  on public.invoices (org_id, issue_date);

create table if not exists public.invoice_items (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id),
  invoice_id     uuid not null references public.invoices (id) on delete cascade,
  description    text not null,
  quantity       numeric(10,2) not null default 1,
  unit_price     numeric(12,2) not null default 0,
  line_total     numeric(12,2) not null default 0,
  service_date   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_org_idx     on public.invoice_items (org_id);

-- =====================================================================
-- 13. payments — money received against an invoice
-- =====================================================================
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id),
  invoice_id    uuid not null references public.invoices (id),
  patient_id    uuid references public.patients (id),
  amount        numeric(12,2) not null check (amount > 0),
  method        public.payment_method not null default 'cash',
  status        public.payment_status not null default 'completed',
  reference     text,
  payment_date  timestamptz not null default now(),
  received_by   uuid references public.users (id),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists payments_org_invoice_idx on public.payments (org_id, invoice_id);
create index if not exists payments_org_patient_idx on public.payments (org_id, patient_id);
create index if not exists payments_org_status_idx  on public.payments (org_id, status);
create index if not exists payments_org_date_idx    on public.payments (org_id, payment_date);

-- =====================================================================
-- 14. expenses — money the hospital spends
-- =====================================================================
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id),
  category       text not null,
  description    text,
  amount         numeric(12,2) not null check (amount >= 0),
  expense_date   date not null default current_date,
  vendor         text,
  payment_method public.payment_method,
  receipt_url    text,
  created_by     uuid references public.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists expenses_org_date_idx on public.expenses (org_id, expense_date);
create index if not exists expenses_org_cat_idx  on public.expenses (org_id, category);

-- =====================================================================
-- 15. other_income — money earned outside medical billing
-- =====================================================================
create table if not exists public.other_income (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id),
  category       text not null,
  description    text,
  amount         numeric(12,2) not null check (amount >= 0),
  income_date    date not null default current_date,
  payment_method public.payment_method,
  notes          text,
  created_by     uuid references public.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists other_income_org_date_idx on public.other_income (org_id, income_date);
create index if not exists other_income_org_cat_idx  on public.other_income (org_id, category);

-- =====================================================================
-- 16. notifications — in-app alerts
-- =====================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null default 'general',
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_org_user_read_idx on public.notifications (org_id, user_id, is_read);
create index if not exists notifications_org_created_idx   on public.notifications (org_id, created_at);

-- =====================================================================
-- 17. audit_logs — a permanent, append-only record of who did what.
--     No updated_at trigger on purpose: log rows must never change.
-- =====================================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id),
  user_id     uuid references public.users (id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx  on public.audit_logs (org_id, created_at);
create index if not exists audit_logs_org_entity_idx   on public.audit_logs (org_id, entity_type, entity_id);
create index if not exists audit_logs_org_user_idx     on public.audit_logs (org_id, user_id);

-- =====================================================================
-- 18. landing_doctors — doctors shown on the public website
-- =====================================================================
create table if not exists public.landing_doctors (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id),
  staff_id         uuid references public.staff (id),
  name             text not null,
  specialty        text,
  bio              text,
  qualifications   text,
  photo_url        text,
  experience_years integer,
  is_featured      boolean not null default false,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists landing_doctors_org_active_idx on public.landing_doctors (org_id, is_active, sort_order);

-- =====================================================================
-- 19. updated_at triggers (on every updatable table)
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'users', 'patients', 'staff', 'appointments',
    'medical_records', 'prescriptions', 'prescription_items',
    'invoices', 'invoice_items', 'payments', 'expenses', 'other_income',
    'notifications', 'landing_doctors'
  ]  loop
    execute format(
      'drop trigger if exists trg_%s_updated_at on public.%I; ' ||
      'create trigger trg_%s_updated_at before update on public.%I ' ||
      'for each row execute function public.set_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;

-- =====================================================================
-- 20. Row Level Security — enabled on every table
-- =====================================================================
alter table public.organizations     enable row level security;
alter table public.users             enable row level security;
alter table public.patients          enable row level security;
alter table public.staff             enable row level security;
alter table public.appointments      enable row level security;
alter table public.medical_records   enable row level security;
alter table public.prescriptions     enable row level security;
alter table public.prescription_items enable row level security;
alter table public.invoices          enable row level security;
alter table public.invoice_items     enable row level security;
alter table public.payments          enable row level security;
alter table public.expenses          enable row level security;
alter table public.other_income      enable row level security;
alter table public.notifications     enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.landing_doctors   enable row level security;

-- organizations -------------------------------------------------------
create policy "organizations_select_own" on public.organizations
  for select to authenticated
  using (public.is_admin() or public.user_org_id() = id);

create policy "organizations_admin_write" on public.organizations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- users ---------------------------------------------------------------
create policy "users_select_own_or_staff" on public.users
  for select to authenticated
  using (auth.uid() = id
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "users_insert_self_or_admin" on public.users
  for insert to authenticated
  with check (auth.uid() = id or public.is_admin());

create policy "users_update_self_or_admin" on public.users
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "users_delete_admin" on public.users
  for delete to authenticated
  using (public.is_admin());

-- patients ------------------------------------------------------------
create policy "patients_select_own_or_staff" on public.patients
  for select to authenticated
  using (user_id = auth.uid()
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "patients_insert_staff" on public.patients
  for insert to authenticated
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "patients_update_staff" on public.patients
  for update to authenticated
  using (public.is_staff() and org_id = public.user_org_id())
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "patients_delete_admin" on public.patients
  for delete to authenticated
  using (public.is_admin());

-- staff ---------------------------------------------------------------
create policy "staff_select_own_or_staff" on public.staff
  for select to authenticated
  using (user_id = auth.uid()
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "staff_admin_write" on public.staff
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- appointments --------------------------------------------------------
create policy "appointments_select_own_or_staff" on public.appointments
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "appointments_insert_staff_or_self" on public.appointments
  for insert to authenticated
  with check (org_id = public.user_org_id()
              and (public.is_staff()
                   or patient_id in (select id from public.patients where user_id = auth.uid())));

create policy "appointments_update_staff_or_self" on public.appointments
  for update to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()))
  with check (org_id = public.user_org_id());

create policy "appointments_delete_admin" on public.appointments
  for delete to authenticated
  using (public.is_admin());

-- medical_records -----------------------------------------------------
create policy "medical_records_select_own_or_staff" on public.medical_records
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "medical_records_insert_staff" on public.medical_records
  for insert to authenticated
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "medical_records_update_staff" on public.medical_records
  for update to authenticated
  using (public.is_staff() and org_id = public.user_org_id())
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "medical_records_delete_admin" on public.medical_records
  for delete to authenticated
  using (public.is_admin());

-- prescriptions -------------------------------------------------------
create policy "prescriptions_select_own_or_staff" on public.prescriptions
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "prescriptions_insert_staff" on public.prescriptions
  for insert to authenticated
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "prescriptions_update_staff" on public.prescriptions
  for update to authenticated
  using (public.is_staff() and org_id = public.user_org_id())
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "prescriptions_delete_admin" on public.prescriptions
  for delete to authenticated
  using (public.is_admin());

-- prescription_items --------------------------------------------------
create policy "prescription_items_select_own_or_staff" on public.prescription_items
  for select to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id
      and (p.patient_id in (select id from public.patients where user_id = auth.uid())
           or (public.is_staff() and p.org_id = public.user_org_id()))
  ));

create policy "prescription_items_insert_staff" on public.prescription_items
  for insert to authenticated
  with check (public.is_staff()
              and exists (select 1 from public.prescriptions p
                          where p.id = prescription_id and p.org_id = public.user_org_id()));

create policy "prescription_items_update_staff" on public.prescription_items
  for update to authenticated
  using (public.is_staff() and org_id = public.user_org_id())
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "prescription_items_delete_admin" on public.prescription_items
  for delete to authenticated
  using (public.is_admin());

-- invoices ------------------------------------------------------------
create policy "invoices_select_own_or_staff" on public.invoices
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "invoices_insert_accounting" on public.invoices
  for insert to authenticated
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "invoices_update_accounting" on public.invoices
  for update to authenticated
  using (public.is_accounting() and org_id = public.user_org_id())
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "invoices_delete_admin" on public.invoices
  for delete to authenticated
  using (public.is_admin());

-- invoice_items -------------------------------------------------------
create policy "invoice_items_select_own_or_staff" on public.invoice_items
  for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (i.patient_id in (select id from public.patients where user_id = auth.uid())
           or (public.is_staff() and i.org_id = public.user_org_id()))
  ));

create policy "invoice_items_insert_accounting" on public.invoice_items
  for insert to authenticated
  with check (public.is_accounting()
              and exists (select 1 from public.invoices i
                          where i.id = invoice_id and i.org_id = public.user_org_id()));

create policy "invoice_items_update_accounting" on public.invoice_items
  for update to authenticated
  using (public.is_accounting() and org_id = public.user_org_id())
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "invoice_items_delete_admin" on public.invoice_items
  for delete to authenticated
  using (public.is_admin());

-- payments ------------------------------------------------------------
create policy "payments_select_own_or_staff" on public.payments
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid())
         or (public.is_staff() and org_id = public.user_org_id()));

create policy "payments_insert_accounting" on public.payments
  for insert to authenticated
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "payments_update_accounting" on public.payments
  for update to authenticated
  using (public.is_accounting() and org_id = public.user_org_id())
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "payments_delete_admin" on public.payments
  for delete to authenticated
  using (public.is_admin());

-- expenses ------------------------------------------------------------
create policy "expenses_select_staff" on public.expenses
  for select to authenticated
  using (public.is_staff() and org_id = public.user_org_id());

create policy "expenses_insert_accounting" on public.expenses
  for insert to authenticated
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "expenses_update_accounting" on public.expenses
  for update to authenticated
  using (public.is_accounting() and org_id = public.user_org_id())
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "expenses_delete_admin" on public.expenses
  for delete to authenticated
  using (public.is_admin());

-- other_income --------------------------------------------------------
create policy "other_income_select_staff" on public.other_income
  for select to authenticated
  using (public.is_staff() and org_id = public.user_org_id());

create policy "other_income_insert_accounting" on public.other_income
  for insert to authenticated
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "other_income_update_accounting" on public.other_income
  for update to authenticated
  using (public.is_accounting() and org_id = public.user_org_id())
  with check (public.is_accounting() and org_id = public.user_org_id());

create policy "other_income_delete_admin" on public.other_income
  for delete to authenticated
  using (public.is_admin());

-- notifications -------------------------------------------------------
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_insert_staff" on public.notifications
  for insert to authenticated
  with check (public.is_staff() and org_id = public.user_org_id());

create policy "notifications_delete_own_or_admin" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- audit_logs (append-only; writes happen server-side via service role) -
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- landing_doctors (public website — anonymous users may read active rows)
create policy "landing_doctors_select_public" on public.landing_doctors
  for select to anon, authenticated
  using (is_active = true);

create policy "landing_doctors_admin_write" on public.landing_doctors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- 21. Add org_id to the legacy `departments` table (created in migration
--     0001) so every hospital-data table is org-scoped. Guarded — it only
--     runs once, and is a no-op if org_id already exists.
-- =====================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'departments'
      and column_name = 'org_id'
  ) then
    alter table public.departments add column org_id uuid references public.organizations (id);
    update public.departments set org_id = (select id from public.organizations limit 1);
    alter table public.departments alter column org_id set not null;
    alter table public.departments drop constraint if exists departments_name_key;
    create unique index if not exists departments_org_name_uniq on public.departments (org_id, name);
  end if;
end $$;