-- Add missing columns to patients table that the application code uses
-- (Add Patient form, dependants/family accounts, medical plan tracking)

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS city                   text,
  ADD COLUMN IF NOT EXISTS state                  text,
  ADD COLUMN IF NOT EXISTS genotype               text,
  ADD COLUMN IF NOT EXISTS marital_status         text,
  ADD COLUMN IF NOT EXISTS medical_plan           text,
  ADD COLUMN IF NOT EXISTS is_primary_account     boolean not null default false,
  ADD COLUMN IF NOT EXISTS primary_account_id     uuid references public.patients (id) on delete set null,
  ADD COLUMN IF NOT EXISTS dependant_relationship text;

-- Fast lookups for family-account queries (dependants list, payment authorization)
create index if not exists patients_primary_account_idx
  on public.patients (primary_account_id);
