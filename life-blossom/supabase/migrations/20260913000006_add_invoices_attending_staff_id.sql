-- Add attending_staff_id to invoices (was missing from original schema)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS attending_staff_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
