-- Bank transfers between hospital bank accounts
CREATE TABLE IF NOT EXISTS bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  from_account_id uuid NOT NULL REFERENCES hospital_bank_accounts(id),
  to_account_id uuid NOT NULL REFERENCES hospital_bank_accounts(id),
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view transfers" ON bank_transfers
  FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org admins and accountants can insert transfers" ON bank_transfers
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'accountant')
  );

CREATE INDEX idx_bank_transfers_org ON bank_transfers(org_id);
CREATE INDEX idx_bank_transfers_from ON bank_transfers(from_account_id);
CREATE INDEX idx_bank_transfers_to ON bank_transfers(to_account_id);
