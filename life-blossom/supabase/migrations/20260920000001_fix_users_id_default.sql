-- Fix: Add gen_random_uuid() default to users.id so dependant creation works.
-- Previously, the dependant API inserted into users without providing an id,
-- which failed because the column had no default value.
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
