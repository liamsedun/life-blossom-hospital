-- Add 'transfer' value to payment_method enum (DB already has 'bank_transfer')
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer';
