-- Add missing invoice_status enum values that the app uses
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'partially_paid';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'refunded';
