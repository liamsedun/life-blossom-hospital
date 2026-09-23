-- =====================================================================
-- Life Blossom — seed data
-- Inserts the hospital organization, the doctors shown on the public
-- website (landing_doctors), and demo login accounts. Safe to run more
-- than once: every insert is guarded with "on conflict ... do nothing",
-- so a second run is a no-op.
-- =====================================================================

-- NOTE ON DEMO ACCOUNTS: the passwords below are DEMO-ONLY. They let you
-- test the login pages and the /admin + /patient middleware guard. Change
-- them (or delete these rows) before the system goes live.
--   Staff portal  → admin@lifeblossom.com.ng    / DemoPass123!
--   Patient portal → patient@lifeblossom.com.ng  / DemoPass123! (also login by patient number PT-00001)

-- 1. The organization (the hospital itself)
insert into public.organizations (
  id, name, legal_name, email, phone, address, city, state, country,
  currency, website, is_active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Life Blossom Cares & Cure Hospital',
  'Life Blossom Cares & Cure Hospital',
  'hello@lifeblossomcares.com.ng',
  '+2348157377000',
  '134 John Isaac Street, G.R.A. Ikeja',
  'Lagos',
  'Lagos',
  'Nigeria',
  'NGN',
  'https://www.lifeblossomcares.com.ng',
  true
)
on conflict (id) do nothing;

-- 2. The doctors shown on the public website
insert into public.landing_doctors (
  id, org_id, name, specialty, bio, qualifications, photo_url,
  experience_years, is_featured, sort_order, is_active
)
values
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Adaeze Okonkwo',
    'Family Medicine',
    'Compassionate family physician focused on preventive care and long-term health for the whole family.',
    'MBBS, FWACP (Family Medicine)',
    '/doctor-1.jpg',
    12, true, 1, true
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Ibrahim Suleiman',
    'Paediatrics',
    'Gentle, experienced paediatrician devoted to the health and happiness of children from birth to adolescence.',
    'MBBS, FWACP (Paediatrics)',
    '/doctor-2.jpg',
    10, true, 2, true
  ),
  (
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Ngozi Eze',
    'Obstetrics & Gynaecology',
    'Dedicated women\u2019s health specialist supporting mothers safely through pregnancy, delivery, and beyond.',
    'MBBS, FMCOG (Obstetrics & Gynaecology)',
    '/doctor-3.jpg',
    15, true, 3, true
  ),
  (
    '00000000-0000-4000-8000-000000000014',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Tunde Adeyemi',
    'General Surgery',
    'Skilled general surgeon with extensive experience in elective and emergency procedures.',
    'MBBS, FWACS (General Surgery)',
    '/doctor-4.jpg',
    18, true, 4, true
  ),
  (
    '00000000-0000-4000-8000-000000000015',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Funmilayo Adebayo',
    'Internal Medicine',
    'Thorough internist who takes time to investigate, explain, and manage complex adult medical conditions.',
    'MBBS, FWACP (Internal Medicine)',
    '/doctor-5.jpg',
    9, false, 5, true
  ),
  (
    '00000000-0000-4000-8000-000000000016',
    '00000000-0000-4000-8000-000000000001',
    'Dr. Chinedu Okafor',
    'Radiology',
    'Radiologist specialising in accurate imaging interpretation — ultrasound, X-ray, and advanced diagnostics.',
    'MBBS, FWACS (Radiology)',
    '/doctor-6.jpg',
    7, false, 6, true
  )
on conflict (id) do nothing;

-- 3. Demo login accounts ------------------------------------------------
--   a) auth.users — the actual login records (password is bcrypt-hashed)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000021',
    'authenticated', 'authenticated',
    'admin@lifeblossom.com.ng',
    crypt('DemoPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Admin"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000022',
    'authenticated', 'authenticated',
    'patient@lifeblossom.com.ng',
    crypt('DemoPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Patient"}',
    now(), now()
  )
on conflict (id) do nothing;

--   b) public.users — app profile used for role-based redirects
insert into public.users (id, org_id, email, phone, full_name, role, is_active)
values
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000001',
    'admin@lifeblossom.com.ng',
    '+2348012345678',
    'Demo Admin',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000001',
    'patient@lifeblossom.com.ng',
    '+2348023456789',
    'Demo Patient',
    'patient',
    true
  )
on conflict (id) do nothing;

--   c) legacy profiles rows (used by is_staff()/is_admin() helpers) must
--      match the real roles. The signup trigger defaults everyone to
--      'patient', so the role-protection trigger is briefly disabled.
alter table public.profiles disable trigger protect_profile_role;
insert into public.profiles (id, full_name, role, phone)
values
  (
    '00000000-0000-4000-8000-000000000021',
    'Demo Admin',
    'admin',
    '+2348012345678'
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    'Demo Patient',
    'patient',
    '+2348023456789'
  )
on conflict (id) do update
  set full_name = excluded.full_name,
      role      = excluded.role,
      phone     = excluded.phone;
alter table public.profiles enable trigger protect_profile_role;

--   d) staff row so the staff number STF-001 also works as a login
insert into public.staff (
  id, org_id, user_id, employee_code, first_name, last_name, role,
  title, phone, email, is_active
)
values (
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000021',
  'STF-001',
  'Demo', 'Admin', 'admin',
  'Hospital Administrator',
  '+2348012345678',
  'admin@lifeblossom.com.ng',
  true
)
on conflict (id) do nothing;

--   e) patients row so the patient number PT-00001 also works as a login
insert into public.patients (
  id, org_id, user_id, patient_number, first_name, last_name,
  date_of_birth, gender, blood_group, phone, email, is_active
)
values (
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000022',
  'PT-00001',
  'Demo', 'Patient',
  '1990-01-15', 'female', 'O+',
  '+2348023456789',
  'patient@lifeblossom.com.ng',
  true
)
on conflict (id) do nothing;