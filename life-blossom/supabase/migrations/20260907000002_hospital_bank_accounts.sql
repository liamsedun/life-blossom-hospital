-- Hospital bank accounts table for managing payment accounts shown to patients

CREATE TABLE IF NOT EXISTS public.hospital_bank_accounts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name       text NOT NULL,
  account_name    text NOT NULL,
  account_number  text NOT NULL,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_bank_accounts_org ON public.hospital_bank_accounts(org_id);

-- Row Level Security
ALTER TABLE public.hospital_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Admins/accountants can manage all bank accounts for their org
CREATE POLICY "Admins can manage bank accounts"
  ON public.hospital_bank_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Patients can view only active bank accounts
CREATE POLICY "Patients can view active bank accounts"
  ON public.hospital_bank_accounts
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'patient'
    )
  );
