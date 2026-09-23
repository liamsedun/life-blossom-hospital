-- Add paid_amount to invoices (denormalized for convenience)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
