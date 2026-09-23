-- Add dispensed_by and dispensed_at columns to prescriptions
-- so pharmacy staff can mark a prescription as dispensed and record who did it and when.

alter table public.prescriptions
  add column if not exists dispensed_by uuid references public.users (id),
  add column if not exists dispensed_at timestamptz;

create index if not exists prescriptions_dispensed_by_idx on public.prescriptions (dispensed_by);
