-- Add bank_account_id to expenses and payments
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.hospital_bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.hospital_bank_accounts(id) ON DELETE SET NULL;
