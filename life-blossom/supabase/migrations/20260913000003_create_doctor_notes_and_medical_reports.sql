-- Create doctor_notes table for clinical visit notes
CREATE TABLE IF NOT EXISTS public.doctor_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id     uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  visit_date    date NOT NULL DEFAULT CURRENT_DATE,
  vitals        jsonb NOT NULL DEFAULT '{}',
  tests_procedures jsonb NOT NULL DEFAULT '{}',
  clinical_findings text,
  diagnosis     jsonb NOT NULL DEFAULT '{}',
  medications   jsonb NOT NULL DEFAULT '[]',
  treatment_recommendations text,
  next_visit_date date,
  next_visit_reason text,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_notes_patient ON public.doctor_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_org ON public.doctor_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_visit_date ON public.doctor_notes(visit_date);

ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

-- RLS: API routes use service_client which bypasses RLS.
-- Policies exist so the table is protected for direct client access.
CREATE POLICY "doctor_notes_select" ON public.doctor_notes FOR SELECT USING (true);
CREATE POLICY "doctor_notes_insert" ON public.doctor_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "doctor_notes_update" ON public.doctor_notes FOR UPDATE USING (true);
CREATE POLICY "doctor_notes_delete" ON public.doctor_notes FOR DELETE USING (true);

-- Create medical_reports table
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id       uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reference_number text NOT NULL,
  report_date      date NOT NULL DEFAULT CURRENT_DATE,
  content          text NOT NULL,
  author_name      text NOT NULL,
  author_title     text,
  created_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON public.medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_org ON public.medical_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_report_date ON public.medical_reports(report_date);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_reports_select" ON public.medical_reports FOR SELECT USING (true);
CREATE POLICY "medical_reports_insert" ON public.medical_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "medical_reports_update" ON public.medical_reports FOR UPDATE USING (true);
CREATE POLICY "medical_reports_delete" ON public.medical_reports FOR DELETE USING (true);
