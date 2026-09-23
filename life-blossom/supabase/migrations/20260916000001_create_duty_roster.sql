-- Create duty_roster table for staff scheduling

CREATE TABLE IF NOT EXISTS duty_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  staff_id uuid NOT NULL REFERENCES staff(id),
  user_id uuid REFERENCES users(id),
  shift_date date NOT NULL,
  from_time time NOT NULL,
  until_time time NOT NULL,
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_roster_staff ON duty_roster(staff_id);
CREATE INDEX IF NOT EXISTS idx_duty_roster_date ON duty_roster(shift_date);
CREATE INDEX IF NOT EXISTS idx_duty_roster_org ON duty_roster(org_id);

ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY duty_roster_select ON duty_roster FOR SELECT USING (true);
CREATE POLICY duty_roster_insert ON duty_roster FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY duty_roster_update ON duty_roster FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY duty_roster_delete ON duty_roster FOR DELETE USING (auth.uid() = created_by);
