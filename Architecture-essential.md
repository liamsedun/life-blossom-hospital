# Life Blossom — Architecture (Essential)

> **Plain-language summary:** `Architecture.md` describes everything we *could* build.
> This file is the opposite: the smallest complete version that is still a real, useful,
> production-grade product. If you are an AI agent or the founder, **build exactly this first.**
> Everything in `Architecture.md` that is not mentioned here is deliberately **deferred.**

---

## 1. The Golden Path (the one journey that must work end-to-end)

> If only one thing works perfectly, it is this. Everything else is polish.

**Doctor books → patient visits → doctor writes notes → billing collects.**

1. Receptionist (or admin) signs in.
2. Adds a patient.
3. Books an appointment for that patient with a doctor, at a time that is free.
4. Doctor signs in, sees today's schedule, opens the appointment, checks the patient in.
5. Doctor completes the visit: symptoms, diagnosis, notes, prescription.
6. Billing staff creates an invoice from the completed visit, records payment, marks it paid.
7. Patient (if they have an account) sees the appointment, the visit summary, and the bill.

---

## 2. Build-First Scope

### 2.1 Tables — only these 7, no more

1. `profiles` — every user, with `role` (`admin`, `doctor`, `receptionist`, `billing`, `patient`)
2. `departments`
3. `doctors`
4. `patients`
5. `appointments` — with the double-booking UNIQUE constraint on `(doctor_id, scheduled_at)`
6. `medical_records` — one per visit
7. `prescriptions`

> **Deferred:** `invoices`, `invoice_items`, `payments`, `lab_orders`, `beds`, `audit_logs`,
> `notifications`, multi-clinic. **Exception:** if billing is a launch requirement, add the three
> billing tables from `Architecture.md` §4.8 — they are small and isolated. Still defer the rest.

### 2.2 Pages — only these, no more

| Route | Purpose | Who |
|---|---|---|
| `/login` | Sign in | everyone |
| `/dashboard` | Today's counts + quick actions + today's appointments list | all roles (content varies) |
| `/appointments` + `/appointments/new` | List + book (slot picker with free/busy) | patient, receptionist, admin |
| `/patients` + `/patients/new` + `/patients/[id]` | CRUD + view history | receptionist, admin, doctor (read) |
| `/doctors` + `/doctors/new` | CRUD (admin only) | admin |
| `/departments` | CRUD (admin only) | admin |
| `/profile` | "My appointments / My visits" for patients | patient |
| `/visits/[id]` | Doctor's visit screen: symptoms → diagnosis → prescription | doctor |

> **Deferred:** `/billing` screens (unless billing is in scope), admin analytics, settings,
> password reset UI polish, search filters beyond name/phone, pagination beyond "load 50".

### 2.3 Features kept to a minimum

- **Auth:** email + password, signup restricted to `patient` self-signup; staff accounts are
  created by an admin (which also assigns the role). Role claims come from the `profiles` table.
- **CRUD:** plain server-side forms with Zod validation. No drag-drop, no fancy tables.
- **PWA:** installable manifest + offline app shell only (a message when offline). No offline writes.
- **Dashboard:** counts (today's appointments, by status, today's completed visits) + today's list.
  No charts yet — a simple table of numbers is fine.

---

## 3. Build-First Data Rules (non-negotiable)

1. **RLS enabled on every table** in the first migration. Policies per `Architecture.md` §5.
   A table without policies does not ship.
2. **All writes via Server Actions** validated with Zod. Never `insert()` from a client
   component with unvalidated form data.
3. **Migrations** in `supabase/migrations/`, numbered and immutable once applied.
4. **`doctor_id + scheduled_at` unique** — the double-booking guard is in the database, not just the UI.
5. **No service-role key in client code. Period.**
6. **Money (if billing ships):** Postgres `numeric` only; store computed `amount` at write time.

---

## 4. The Build Order (each step leaves the app working)

> Follow this order. Each item ends with something you can run and see.

| Step | Deliverable | "Done" looks like |
|---|---|---|
| 1 | Scaffold Next.js + Tailwind + folder structure | `npm run dev` shows the home page |
| 2 | Supabase project + first migration (the 7 tables + RLS) | `supabase db push` succeeds; policies verified in SQL editor |
| 3 | Auth: login page, signup, `middleware.ts` route guard | You can sign in; unauth users get redirected |
| 4 | Profiles + seed data (admin, doctor, receptionist, sample patients) | `supabase db seed` then login as each role |
| 5 | Departments + doctors admin CRUD | Admin can add a department and a doctor |
| 6 | Patients CRUD + search | Receptionist adds a patient and finds them by name |
| 7 | Appointments: book, list, cancel, check-in | Golden path steps 1–3 work |
| 8 | Doctor visit screen: schedule → visit → prescription | Golden path steps 4–5 work |
| 9 | Patient portal (own appointments + visits) | A patient account sees only their own data |
| 10 | Dashboard per role | Each role sees relevant counts |
| 11 | PWA: manifest, icons, service worker | Installable in Chrome; opens offline |
| 12 | Typecheck, lint, unit tests, seed → fresh build on Netlify | `npm run build` green; production URL works |

---

## 5. What NOT To Do In Phase 1 (write this on a sticky note)

- ❌ No extra tables (labs, beds, inventory, audit logs, notifications)
- ❌ No charts/analytics dashboards
- ❌ No offline write-queueing or background sync
- ❌ No SMS/email notifications
- ❌ No multi-branch/tenant logic
- ❌ No file uploads / storage
- ❌ No drag-drop calendars
- ❌ No new dependencies beyond the stack list — ask before adding
- ❌ No "while I'm here" features. **If it's not in the table above, it waits.**

> **Why this is so strict:** every extra feature multiplies bugs, security review, and testing.
> A small system that is *finished, tested, and live* beats a big system that is 80% done forever.

---

## 6. Definition of Done (per step and for the whole phase)

A step is **done** when:
- [ ] Works end-to-end for its intended user (test it as that role, not as admin)
- [ ] `npm run build` and `npx tsc --noEmit` pass
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests for its logic pass (`npm test`)
- [ ] RLS verified: log in as a *patient* and confirm you cannot see other patients' data
- [ ] `stages-of-completion.md` updated (check the box)

Phase 1 is **done** when the Golden Path (§1) works on a **live Netlify URL** with real
Supabase credentials, on a phone browser.

---

*Last updated: 2026-09-04 — The "build this first" contract. Full design in `Architecture.md`.*