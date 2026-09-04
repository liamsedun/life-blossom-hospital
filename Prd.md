# Life Blossom — Product Requirements Document (PRD)

> **Plain-language summary:** This document explains *what* we are building and *why*.
> It describes the app's vision, the people who use it, the features, and the step-by-step
> journeys each user goes through. It does NOT describe how the code is built — that is `Architecture.md`.

---

## 1. Vision

**Life Blossom** is a web + PWA (Progressive Web App) Hospital Management System for small
clinics and hospitals. It replaces paper registers, whiteboards, and scattered spreadsheets
with one simple, secure place to run the daily work of a hospital:

- Patients book appointments from their phone
- Receptionists check patients in
- Doctors see their schedule and write notes & prescriptions
- Admins manage staff, departments, and the whole hospital
- Billing staff create invoices and record payments

**One-line vision:** *"Run a whole hospital from one clean dashboard — on any device, even offline-ish, without expensive software."*

**Why PWA?** A PWA means patients and staff can "install" the app on their phone home screen
like a native app, and it works well on slow connections. No app-store approval needed.

**Product principles:**
1. **Simple first** — every screen answers one question ("Who is next?", "What is owed?").
2. **Secure by default** — patient data is protected by database security rules, never by hiding buttons.
3. **Production-ready** — typed code, tests, backups, monitoring, and upgrade paths from day one.
4. **Cheap to run** — free tiers of Supabase + Netlify are enough for a real launch.

---

## 2. Problem Statement

Small hospitals lose time and money to:
- Lost or duplicated paper records
- Double-booked appointments
- No central record of what a patient was diagnosed with or prescribed
- Bills that get lost and revenue that is never collected
- No way to know daily hospital activity at a glance

---

## 3. Target Users (Personas)

| Persona | Role | Tech comfort | Primary need |
|---|---|---|---|
| **Dr. Amara** | Doctor | Medium | See today's patients, write notes & prescriptions fast |
| **Rita** | Receptionist | Low | Book / check in patients, find patient records quickly |
| **Ben** | Billing officer | Low | Turn a visit into an invoice, record payment |
| **Grace** | Patient | Low-Medium | Book appointments, see her history & bills |
| **Dr. Owusu** | Hospital admin | High | Manage staff, departments, see hospital-wide stats |

---

## 4. Feature Scope

### 4.1 MVP (must build — see `Architecture-essential.md`)

| # | Feature | Users | Notes |
|---|---|---|---|
| F1 | **Authentication & roles** | All | Email + password via Supabase Auth. Roles: `admin`, `doctor`, `receptionist`, `billing`, `patient` |
| F2 | **Patient management** | Receptionist, Admin, Doctor | Add / search / view patients (demographics, contact, emergency contact) |
| F3 | **Department & doctor management** | Admin | Create departments; add doctors with specialty + department |
| F4 | **Appointments** | Patient, Receptionist, Doctor | Book, list, cancel, check-in, complete. Prevents double-booking a doctor at the same time |
| F5 | **Doctor daily schedule** | Doctor | See today's appointments in order, open each patient's record |
| F6 | **Medical records (visit notes)** | Doctor | Per-visit diagnosis, symptoms, notes |
| F7 | **Prescriptions** | Doctor | Medication, dosage, frequency, duration, instructions |
| F8 | **Billing** | Billing, Admin | Invoice per visit with line items, record payments, mark paid |
| F9 | **Patient portal** | Patient | Own appointments, own past visits, own bills & payments |
| F10 | **Dashboard** | All | Role-aware summary: today's counts, upcoming appointments, outstanding bills |
| F11 | **PWA** | All | Installable, offline shell, responsive on phone/tablet/desktop |

### 4.2 Later (out of MVP)

- Lab / test orders and results
- Inpatient beds & admissions
- Pharmacy inventory / stock
- SMS / email reminders (notifications)
- Telemedicine / video calls
- Multi-branch (tenant) support
- Audit log UI & advanced analytics
- Insurance claim workflows

---

## 5. User Journeys

> A user journey is just the step-by-step story of one person getting something done.
> We build the app so these stories flow smoothly.

### Journey 1 — Grace (patient) books an appointment 📅
1. Opens the Life Blossom PWA on her phone → taps **Book Appointment**.
2. Signs in (or creates an account with email + password).
3. Picks a **department** (e.g., Cardiology).
4. Sees available **doctors** with a time slot grid (busy slots greyed out).
5. Picks a slot → enters the **reason** → taps **Confirm**.
6. Sees a confirmation screen with date, time, doctor. A card appears in **My Appointments**.
7. *Later:* she cancels by opening the appointment and tapping **Cancel**.

### Journey 2 — Rita (receptionist) checks in a walk-in patient 🏥
1. Signs in → lands on **Reception Dashboard** (today's appointments).
2. Patient arrives → Rita **searches** by name or phone.
3. If patient has an appointment: opens it → taps **Check in**.
4. If not: taps **New Patient**, fills the form, then **New Appointment** for a free slot.
5. Doctor's schedule now shows the patient as checked in.

### Journey 3 — Dr. Amara sees her day 👩‍⚕️
1. Signs in → sees **Today's Schedule** (time, patient, status).
2. Taps the first checked-in patient → sees patient summary (age, blood group, history).
3. Taps **Start Visit** → adds symptoms, diagnosis, and notes.
4. Adds a **prescription** (drug, dose, frequency, duration).
5. Saves → the visit is recorded and the appointment is marked **Completed**.

### Journey 4 — Ben (billing) collects payment 💳
1. The completed visit appears in **Pending Invoices** (or Ben creates one manually).
2. Opens the invoice → items are listed (consultation, procedures).
3. Records a **payment** (cash / card / mobile money), or marks partial.
4. Invoice becomes **Paid** → shows on the patient's portal too.

### Journey 5 — Dr. Owusu (admin) runs the hospital 🏢
1. Opens **Staff** → adds a new doctor (name, specialty, department, account role).
2. Opens **Departments** → adds "Radiology".
3. Opens **Dashboard** → sees today's appointments, visits completed, revenue collected this week.
4. Reviews the **billing summary** to spot unpaid invoices.

---

## 6. Non-Functional Requirements (the "how well" requirements)

| Area | Requirement |
|---|---|
| **Security** | All data access enforced by Postgres Row Level Security (RLS) — server-enforced, not UI-hidden. Passwords never stored by us (Supabase Auth). Service-role key never in the browser. HTTPS everywhere. |
| **Privacy** | Role-based access: patients see only their own data; staff see what their role needs. Treat data as health data even though we're not HIPAA-covered yet — design as if we are. |
| **Performance** | Dashboard loads < 2s on a mid-range phone. Database queries use indexes. |
| **Reliability** | Supabase handles backups automatically (free tier: daily backups). Netlify handles hosting/HTTPS/CDN. |
| **PWA** | Installable, offline "shell" (app opens offline with a friendly message), fast repeat loads via caching. |
| **Accessibility** | Keyboard navigable, readable contrast, semantic HTML. |
| **Maintainability** | TypeScript strict mode, small components, no dead code, lint + typecheck pass in CI. |

---

## 7. Success Metrics

| Metric | How to measure | Launch target |
|---|---|---|
| Appointments booked online | Count of patient-created appointments / week | > 30% of bookings |
| No-shows | cancelled/no-show ÷ total appointments | < 15% |
| Time to check in a patient | Time from arrival to check-in | < 2 minutes |
| Bills collected | paid ÷ issued (last 30 days) | > 85% |
| Staff adoption | active staff logins / week | > 80% of staff |

---

## 8. Constraints & Assumptions

- **Solo founder** building with AI agents — scope must stay small and shippable (see `resourcing-and-projections.md`).
- Runs on **Supabase Free** + **Netlify Free** at launch ($0/month — see cost doc).
- English UI at launch (structure ready for i18n later).
- Single clinic/branch at launch; multi-branch is a later phase.
- Beginner-friendly codebase: clear names, comments where helpful, one obvious way to do things.

---

*Last updated: 2026-09-04 — Status: docs phase, app not yet scaffolded.*