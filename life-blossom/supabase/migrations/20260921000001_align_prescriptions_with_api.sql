-- Align prescriptions and prescription_items tables with the API/types.
-- Adds missing columns; does not drop existing ones.

-- ── prescriptions ──────────────────────────────────────────────
alter table public.prescriptions
  add column if not exists appointment_id uuid references public.appointments (id),
  add column if not exists diagnosis      text,
  add column if not exists status         text not null default 'active';

-- ── prescription_items ─────────────────────────────────────────
alter table public.prescription_items
  add column if not exists medication_name    text,
  add column if not exists duration           text,
  add column if not exists refills_remaining  integer not null default 0;

-- Back-fill medication_name from medicine_name where it is null
update public.prescription_items
   set medication_name = medicine_name
 where medication_name is null and medicine_name is not null;
