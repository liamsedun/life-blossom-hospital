-- Add missing columns to payments table
ALTER TABLE payments ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN transaction_ref text;

-- Add 'pos' to payment_method enum (used by POS declarations)
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pos';
