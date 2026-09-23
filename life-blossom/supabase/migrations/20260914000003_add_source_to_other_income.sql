-- Add missing 'source' and 'bank_account_id' columns to other_income table
ALTER TABLE other_income ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE other_income ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES hospital_bank_accounts(id);
