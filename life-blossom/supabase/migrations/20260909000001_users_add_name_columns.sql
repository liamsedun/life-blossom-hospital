-- Add first_name, last_name, avatar_url, password_hash to users table
-- The existing full_name column is kept for backward compatibility

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name  text not null default '',
  ADD COLUMN IF NOT EXISTS last_name   text not null default '',
  ADD COLUMN IF NOT EXISTS avatar_url  text,
  ADD COLUMN IF NOT EXISTS password_hash text not null default '';

-- Backfill first_name and last_name from full_name where they are empty
UPDATE public.users
SET first_name = split_part(full_name, ' ', 1),
    last_name  =CASE
      WHEN position(' ' in full_name) > 0 THEN split_part(full_name, ' ', 2)
      ELSE ''
    END
WHERE first_name = '' AND full_name != '';
