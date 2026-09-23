-- ============================================================================
-- Seed demo data for student accounts
-- Creates auth users, profiles, and fills with realistic demo data
-- ============================================================================

-- ─── 0. Auth users (must be outside transaction for DDL) ───

-- Student Staff
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'studentstaff@gmail.com',
  crypt('StudentStaff@123', gen_salt('bf')),
  now(), now(), now(),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  '{"provider":"email","providers":["email"]}',
  '{"email":"studentstaff@gmail.com","full_name":"Chioma Student","first_name":"Chioma","last_name":"Student","role":"student_staff"}',
  false, now()
)
ON CONFLICT (id) DO NOTHING;

-- Student Patient
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'studentPatient@gmail.com',
  crypt('StudentPatient@123', gen_salt('bf')),
  now(), now(), now(),
  encode(gen_random_bytes(32), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  '{"provider":"email","providers":["email"]}',
  '{"email":"studentPatient@gmail.com","full_name":"Emeka Patient","first_name":"Emeka","last_name":"Patient","role":"student_patient"}',
  false, now()
)
ON CONFLICT (id) DO NOTHING;

-- Auth identities
INSERT INTO auth.identities (id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'studentstaff@gmail.com', 'email',
   '{"sub":"a1000000-0000-4000-8000-000000000001","email":"studentstaff@gmail.com"}',
   now(), now(), now()),
  ('b2000000-0000-4000-8000-000000000001', 'studentPatient@gmail.com', 'email',
   '{"sub":"b2000000-0000-4000-8000-000000000001","email":"studentPatient@gmail.com"}',
   now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Auth sessions (so they can log in immediately)
INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after)
VALUES
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', now(), now(), null, 'aal1', now() + interval '7 days'),
  (gen_random_uuid(), 'b2000000-0000-4000-8000-000000000001', now(), now(), null, 'aal1', now() + interval '7 days');

-- ─── 1. Public user records ───

INSERT INTO public.users (id, org_id, email, full_name, role, first_name, last_name, is_active, avatar_url)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'studentstaff@gmail.com', 'Chioma Student', 'student_staff', 'Chioma', 'Student', true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=ChiomaStudent'),
  ('b2000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'studentPatient@gmail.com', 'Emeka Patient', 'student_patient', 'Emeka', 'Patient', true,
   'https://api.dicebear.com/7.x/avataaars/svg?seed=EmekaPatient')
ON CONFLICT (id) DO NOTHING;

-- Legacy profiles table (some code paths query this)
INSERT INTO public.profiles (id, full_name, role)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Chioma Student', 'student_staff'),
  ('b2000000-0000-4000-8000-000000000001', 'Emeka Patient', 'student_patient')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Staff record for student_staff ───

INSERT INTO public.staff (id, org_id, user_id, employee_code, first_name, last_name, role, title, specialty, phone, email, date_joined, is_active)
VALUES (
  'aa000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'STU-001',
  'Chioma', 'Student',
  'student_staff', 'Student Intern', 'General Administration',
  '+234 801 234 5678', 'studentstaff@gmail.com',
  '2026-09-01', true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Patient record for student_patient ───

INSERT INTO public.patients (
  id, org_id, user_id, patient_number, first_name, last_name, date_of_birth, gender,
  blood_group, phone, email, address, city, state,
  emergency_contact_name, emergency_contact_phone, emergency_contact_rel,
  genotype, marital_status, is_primary_account, is_active
) VALUES (
  'cc000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001',
  'PT-2026-0099',
  'Emeka', 'Patient',
  '1998-05-15', 'male',
  'O+', '+234 802 345 6789', 'studentPatient@gmail.com',
  '12 Allen Avenue, Ikeja', 'Lagos', 'Lagos',
  'Ngozi Patient', '+234 803 456 7890', 'spouse',
  'AA', 'single', true, true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Dependants (family members) ───

-- Dependant 1: spouse
INSERT INTO public.patients (
  id, org_id, patient_number, first_name, last_name, date_of_birth, gender,
  blood_group, phone, address, city, state,
  genotype, marital_status, is_primary_account, primary_account_id, dependant_relationship, is_active
) VALUES (
  'dd000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'PT-2026-0100',
  'Ngozi', 'Patient',
  '2000-08-20', 'female',
  'B+', '+234 804 567 8901',
  '12 Allen Avenue, Ikeja', 'Lagos', 'Lagos',
  'AS', 'married', false,
  'cc000000-0000-4000-8000-000000000001',
  'spouse', true
)
ON CONFLICT (id) DO NOTHING;

-- Dependant 2: child
INSERT INTO public.patients (
  id, org_id, patient_number, first_name, last_name, date_of_birth, gender,
  blood_group, phone, address, city, state,
  genotype, is_primary_account, primary_account_id, dependant_relationship, is_active
) VALUES (
  'ee000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'PT-2026-0101',
  'Chidi', 'Patient',
  '2015-03-10', 'male',
  'A+', '+234 805 678 9012',
  '12 Allen Avenue, Ikeja', 'Lagos', 'Lagos',
  'AA', false,
  'cc000000-0000-4000-8000-000000000001',
  'child', true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Appointments ───

-- Look up an existing doctor to reference
DO $$
DECLARE
  v_doctor_id uuid;
  v_dept_id uuid;
BEGIN
  SELECT id INTO v_doctor_id FROM public.staff WHERE role = 'doctor' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1;
  SELECT id INTO v_dept_id FROM public.departments WHERE org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1;

  -- Past completed appointment
  INSERT INTO public.appointments (id, org_id, patient_id, doctor_id, department_id, scheduled_at, status, reason, created_by)
  VALUES (
    'f1000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id, v_dept_id,
    now() - interval '14 days',
    'completed', 'Routine checkup — annual physical examination',
    'a1000000-0000-4000-8000-000000000001'
  ) ON CONFLICT DO NOTHING;

  -- Past completed appointment for dependant
  INSERT INTO public.appointments (id, org_id, patient_id, doctor_id, department_id, scheduled_at, status, reason, created_by)
  VALUES (
    'f2000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'ee000000-0000-4000-8000-000000000001',
    v_doctor_id, v_dept_id,
    now() - interval '7 days',
    'completed', 'Child vaccination — measles booster',
    'b2000000-0000-4000-8000-000000000001'
  ) ON CONFLICT DO NOTHING;

  -- Confirmed upcoming appointment
  INSERT INTO public.appointments (id, org_id, patient_id, doctor_id, department_id, scheduled_at, status, reason, created_by)
  VALUES (
    'f3000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id, v_dept_id,
    now() + interval '3 days',
    'confirmed', 'Follow-up on blood test results',
    'a1000000-0000-4000-8000-000000000001'
  ) ON CONFLICT DO NOTHING;

  -- Scheduled appointment in the future
  INSERT INTO public.appointments (id, org_id, patient_id, doctor_id, department_id, scheduled_at, status, reason, created_by)
  VALUES (
    'f4000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id, v_dept_id,
    now() + interval '10 days',
    'scheduled', 'Dental cleaning and checkup',
    'b2000000-0000-4000-8000-000000000001'
  ) ON CONFLICT DO NOTHING;

  -- Cancelled appointment
  INSERT INTO public.appointments (id, org_id, patient_id, doctor_id, department_id, scheduled_at, status, reason, notes, created_by)
  VALUES (
    'f5000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id, v_dept_id,
    now() - interval '5 days',
    'cancelled', 'Eye examination',
    'Patient requested cancellation — rescheduled to next month',
    'a1000000-0000-4000-8000-000000000001'
  ) ON CONFLICT DO NOTHING;

  -- ─── 6. Doctor notes (for completed appointments) ───
  INSERT INTO public.doctor_notes (id, org_id, patient_id, doctor_id, appointment_id, visit_date, vitals, clinical_findings, diagnosis, treatment_recommendations, created_by)
  VALUES (
    'fa000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id,
    'f1000000-0000-4000-8000-000000000001',
    (now() - interval '14 days')::date,
    '{"blood_pressure":"120/78","heart_rate":72,"temperature":36.8,"weight":78,"height":175}',
    'Patient appears healthy. No signs of distress. Lungs clear, heart rhythm regular. BMI within normal range.',
    '{"primary":"General checkup - all parameters normal","secondary":"Mild tension noted — suggest stress management"}',
    'Continue regular exercise. Increase water intake. Follow up in 6 months or if symptoms arise.',
    v_doctor_id
  ) ON CONFLICT DO NOTHING;

  -- ─── 7. Medical reports ───
  INSERT INTO public.medical_reports (id, org_id, patient_id, reference_number, report_date, content, author_name, author_title, created_by)
  VALUES (
    'fb000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    'RPT-2026-0042',
    (now() - interval '13 days')::date,
    'Complete Blood Count (CBC) — All values within normal range. Haemoglobin: 14.2 g/dL (Normal: 13.5-17.5). White Blood Cells: 6,800/μL (Normal: 4,500-11,000). Platelets: 245,000/μL (Normal: 150,000-400,000). Fasting Blood Sugar: 92 mg/dL (Normal: 70-100). Lipid Panel: Total Cholesterol 195 mg/dL (Desirable <200). HDL 58, LDL 118, Triglycerides 120. Liver function tests normal. Kidney function normal. No abnormalities detected.',
    'Dr. Amina Bello', 'Consultant Pathologist',
    v_doctor_id
  ) ON CONFLICT DO NOTHING;

  -- ─── 8. Prescriptions ───
  INSERT INTO public.prescriptions (id, org_id, patient_id, doctor_id, appointment_id, diagnosis, status, instructions, prescribed_at, created_by)
  VALUES (
    'fc000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id,
    'f1000000-0000-4000-8000-000000000001',
    'Mild tension headache — stress related',
    'active',
    'Take after meals. Avoid alcohol. Complete full course.',
    now() - interval '14 days',
    v_doctor_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.prescription_items (id, org_id, prescription_id, medicine_name, medication_name, dosage, frequency, duration_days, route, quantity, instructions)
  VALUES
    ('fd000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'fc000000-0000-4000-8000-000000000001',
     'Paracetamol', 'Paracetamol', '500mg', 'Three times daily', 7, 'oral', 21, 'For headache relief'),
    ('fe000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'fc000000-0000-4000-8000-000000000001',
     'Vitamin B Complex', 'Vitamin B Complex', '1 tablet', 'Once daily', 30, 'oral', 30, 'Supplement for stress relief')
  ON CONFLICT DO NOTHING;

  -- Second prescription (completed, from dependant visit)
  INSERT INTO public.prescriptions (id, org_id, patient_id, doctor_id, appointment_id, diagnosis, status, instructions, dispensed_by, dispensed_at, prescribed_at, created_by)
  VALUES (
    'ff000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'ee000000-0000-4000-8000-000000000001',
    v_doctor_id,
    'f2000000-0000-4000-8000-000000000001',
    'Measles booster vaccination',
    'completed',
    'Keep hydrated. Monitor for mild fever for 48 hours.',
    'a1000000-0000-4000-8000-000000000001',
    now() - interval '7 days',
    now() - interval '7 days',
    v_doctor_id
  ) ON CONFLICT DO NOTHING;

  -- ─── 9. Invoices ───
  INSERT INTO public.invoices (id, org_id, invoice_number, patient_id, appointment_id, issue_date, due_date, subtotal, tax, discount, total, paid_amount, status, notes, created_by)
  VALUES
    ('ba000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'INV-2026-0088', 'cc000000-0000-4000-8000-000000000001',
     'f1000000-0000-4000-8000-000000000001',
     (now() - interval '14 days')::date, (now() - interval '7 days')::date,
     45000.00, 3600.00, 0.00, 48600.00, 48600.00, 'paid',
     'Annual checkup — consultation + lab tests',
     'a1000000-0000-4000-8000-000000000001'),
    ('ba000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
     'INV-2026-0089', 'cc000000-0000-4000-8000-000000000001',
     'f3000000-0000-4000-8000-000000000001',
     (now() - interval '1 day')::date, (now() + interval '6 days')::date,
     15000.00, 1200.00, 0.00, 16200.00, 0.00, 'issued',
     'Follow-up consultation — blood test review',
     'a1000000-0000-4000-8000-000000000001'),
    ('ba000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
     'INV-2026-0090', 'ee000000-0000-4000-8000-000000000001',
     'f2000000-0000-4000-8000-000000000001',
     (now() - interval '7 days')::date, (now())::date,
     8500.00, 680.00, 0.00, 9180.00, 9180.00, 'paid',
     'Child vaccination — measles booster',
     'b2000000-0000-4000-8000-000000000001')
  ON CONFLICT DO NOTHING;

  -- Invoice items
  INSERT INTO public.invoice_items (id, org_id, invoice_id, description, quantity, unit_price, line_total, vat_percent, vat_amount)
  VALUES
    ('bb000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'General Consultation', 1, 15000.00, 15000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'Complete Blood Count (CBC)', 1, 12000.00, 12000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'Lipid Panel', 1, 8000.00, 8000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'Liver Function Test', 1, 5000.00, 5000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'Kidney Function Test', 1, 5000.00, 5000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000002',
     'Follow-up Consultation', 1, 10000.00, 10000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000002',
     'Blood Glucose Test', 1, 5000.00, 5000.00, 0, 0),
    ('bb000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000003',
     'Measles Booster Vaccine', 1, 8500.00, 8500.00, 0, 0)
  ON CONFLICT DO NOTHING;

  -- ─── 10. Payments ───
  INSERT INTO public.payments (id, org_id, invoice_id, patient_id, amount, method, status, reference, payment_date, notes, created_by)
  VALUES
    ('bc000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000001',
     'cc000000-0000-4000-8000-000000000001',
     48600.00, 'bank_transfer', 'completed',
     'TXN-20260909-001',
     now() - interval '12 days',
     'Full payment for annual checkup',
     'a1000000-0000-4000-8000-000000000001'),
    ('bc000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
     'ba000000-0000-4000-8000-000000000003',
     'ee000000-0000-4000-8000-000000000001',
     9180.00, 'cash', 'completed',
     'TXN-20260916-002',
     now() - interval '6 days',
     'Cash payment for vaccination',
     'b2000000-0000-4000-8000-000000000001')
  ON CONFLICT DO NOTHING;

  -- ─── 11. Internal messages ───
  -- Message 1: admin → student_staff (welcome)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_messages') THEN
    INSERT INTO public.internal_messages (id, org_id, sender_id, subject, body, created_at)
    VALUES ('ba100000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
            (SELECT id FROM public.users WHERE role = 'admin' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1),
            'Welcome to the Team!',
            'Hi Chioma, welcome to Life Blossom Hospital! We are thrilled to have you join us as a student intern. Please review the onboarding documents in the shared drive and reach out if you have any questions. Your supervisor will be in touch shortly.',
            now() - interval '20 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.internal_message_recipients (id, message_id, recipient_id, is_read, read_at)
    VALUES (gen_random_uuid(),
            'ba100000-0000-4000-8000-000000000001',
            'a1000000-0000-4000-8000-000000000001',
            true, now() - interval '19 days')
    ON CONFLICT DO NOTHING;

    -- Message 2: student_staff → admin (reply)
    INSERT INTO public.internal_messages (id, org_id, sender_id, subject, body, created_at)
    VALUES ('ba100000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
            'a1000000-0000-4000-8000-000000000001',
            'Re: Welcome to the Team!',
            'Thank you so much! I have reviewed the onboarding documents and I am excited to get started. Looking forward to learning from the team.',
            now() - interval '19 days')
    ON CONFLICT DO NOTHING;

    -- Message 3: student_staff ↔ another staff (chat-like)
    INSERT INTO public.internal_messages (id, org_id, sender_id, subject, body, created_at)
    VALUES ('ba100000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
            'a1000000-0000-4000-8000-000000000001',
            'Question about patient records',
            'Hi, I am working on the patient records audit and noticed some discrepancies in the billing section for PT-2026-0055. Could someone from the finance team take a look? Thanks!',
            now() - interval '3 days')
    ON CONFLICT DO NOTHING;

    -- Message 4: to student_patient (appointment reminder)
    INSERT INTO public.internal_messages (id, org_id, sender_id, subject, body, created_at)
    VALUES ('ba100000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001',
            (SELECT id FROM public.users WHERE role = 'admin' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1),
            'Appointment Reminder',
            'Dear Emeka, this is a reminder that you have an upcoming appointment on ' || to_char(now() + interval '3 days', 'FMMonth DD, YYYY') || ' at 10:00 AM. Please arrive 15 minutes early. If you need to reschedule, please contact us.',
            now() - interval '1 day')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.internal_message_recipients (id, message_id, recipient_id, is_read)
    VALUES (gen_random_uuid(),
            'ba100000-0000-4000-8000-000000000004',
            'b2000000-0000-4000-8000-000000000001',
            false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 12. Chats ───
  -- Chat between student_patient and a doctor
  INSERT INTO public.chats (id, org_id, patient_id, staff_user_id, last_message, last_sender_id, last_message_at)
  VALUES (
    'ca000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'cc000000-0000-4000-8000-000000000001',
    v_doctor_id,
    'Thank you, doctor. I will follow the prescription.',
    'b2000000-0000-4000-8000-000000000001',
    now() - interval '13 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.chat_messages (chat_id, sender_id, message, is_read, created_at)
  VALUES
    ('ca000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
     'Good morning, doctor. I wanted to ask about my test results.', true, now() - interval '13 days' - interval '2 hours'),
    ('ca000000-0000-4000-8000-000000000001', v_doctor_id,
     'Good morning, Emeka. Your results look great — all values are within normal range. I have uploaded the full report to your medical records.', true, now() - interval '13 days' - interval '1 hour'),
    ('ca000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
     'Thank you, doctor. I will follow the prescription.', true, now() - interval '13 days')
  ON CONFLICT DO NOTHING;

  -- Chat between student_staff and admin (staff-to-staff)
  INSERT INTO public.chats (id, org_id, recipient_user_id, staff_user_id, last_message, last_sender_id, last_message_at)
  VALUES (
    'ca000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.users WHERE role = 'admin' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1),
    'Sure, I will send them over now.',
    'a1000000-0000-4000-8000-000000000001',
    now() - interval '5 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.chat_messages (chat_id, sender_id, message, is_read, created_at)
  VALUES
    ('ca000000-0000-4000-8000-000000000002',
     (SELECT id FROM public.users WHERE role = 'admin' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1),
     'Hi Chioma, do you have the updated ward rotation schedule?', true, now() - interval '5 days' - interval '3 hours'),
    ('ca000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001',
     'Yes, I have it ready. Should I email it or drop it off at your office?', true, now() - interval '5 days' - interval '2 hours'),
    ('ca000000-0000-4000-8000-000000000002',
     (SELECT id FROM public.users WHERE role = 'admin' AND org_id = '00000000-0000-4000-8000-000000000001' LIMIT 1),
     'You can send it through the internal mail. Thanks!', true, now() - interval '5 days' - interval '1 hour'),
    ('ca000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001',
     'Sure, I will send them over now.', true, now() - interval '5 days')
  ON CONFLICT DO NOTHING;

END $$;
