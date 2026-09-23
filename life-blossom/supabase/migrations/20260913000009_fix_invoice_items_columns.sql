-- Add vat columns to invoice_items, rename total_price → line_total
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS vat_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0;

-- Rename total_price to line_total if total_price exists and line_total doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'total_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'line_total'
  ) THEN
    ALTER TABLE public.invoice_items RENAME COLUMN total_price TO line_total;
  END IF;
END $$;
