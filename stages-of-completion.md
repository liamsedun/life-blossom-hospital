# Life Blossom — Stages of Completion (live tracker)

> **Plain-language summary:** This is the project's progress board. Each checkbox is a real,
> testable deliverable. AI agents and the founder both update it — check a box only when the
> "done" conditions are actually met (see `Architecture-essential.md` §6).
>
> **Legend:** `[x]` = done · `[ ]` = not done · **Status** column shows where we are.

**Overall status:** 🟢 Phase 0 complete · 🟡 Next: Phase 1 (scaffold the app)
**Last updated:** 2026-09-04

---

## Phase 0 — Documentation & Planning

> Goal: the team (founder + AI) knows what we're building, how, and why — before any code.

| Done? | Deliverable | Notes |
|---|---|---|
| [x] | `Prd.md` — vision, personas, features, user journeys | 5 personas, 5 journeys, MVP scope |
| [x] | `Architecture.md` — full technical design, data model, scaling path | 9 tables designed, RLS matrix, 4 scaling phases |
| [x] | `Architecture-essential.md` — the build-first contract | Golden path + 12 build steps + do-NOT list |
| [x] | `Agents.md` — hard rules for AI agents | Security, quality bar, session ritual |
| [x] | `MiMo.md` — working notes & session context | Decisions log, gotchas, next steps |
| [x] | `resourcing-and-projections.md` — team, timeline, costs | 5–7 weeks, $0/month at launch |
| [x] | `stages-of-completion.md` — this tracker | You are reading it 😊 |

**Phase 0 is DONE when:** all 7 docs exist and the founder has read `Prd.md` +
`Architecture-essential.md` + `resourcing-and-projections.md`. ✅

---

## Phase 1 — Foundation (Weeks 1 of the plan)

> Goal: a running Next.js app, connected to Supabase, where you can sign in.

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 1.1 | Scaffold Next.js + Tailwind + folder structure | `npm run dev` → home page loads |
| [ ] | 1.2 | Supabase project + migration 0001 (7 tables + RLS) + seed | `supabase db push` succeeds; policies verified |
| [ ] | 1.3 | Auth: login, signup, route guard (`middleware.ts`) | Sign in as each role; logged-out users redirected |
| [ ] | 1.4 | Profiles trigger + role assignment (admin creates staff) | New signup auto-creates profile; patient ≠ staff |

---

## Phase 2 — People & Places (Week 2)

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 2.1 | Departments CRUD (admin) | Admin adds/edits a department |
| [ ] | 2.2 | Doctors CRUD (admin) | Admin adds a doctor with specialty + department |
| [ ] | 2.3 | Patients CRUD + search | Receptionist adds a patient, finds them by name/phone |

---

## Phase 3 — Appointments (Week 3) ★ the heart

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 3.1 | Book appointment (free/busy slot picker) | Book a slot; busy slots are blocked |
| [ ] | 3.2 | List, cancel, check-in | Status flows `scheduled → checked_in → completed/cancelled` |
| [ ] | 3.3 | Double-booking guard in the DB | Two bookings same doctor+time → second rejected |

---

## Phase 4 — Clinical Visit (Week 4)

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 4.1 | Doctor daily schedule | Doctor sees today's list in order |
| [ ] | 4.2 | Visit screen: symptoms → diagnosis → notes | Visit saves and appears in patient history |
| [ ] | 4.3 | Prescriptions | Drug, dose, frequency, duration saved per visit |

---

## Phase 5 — Billing & Patient Portal (Week 5)

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 5.1 | Invoices from completed visits + line items | Visit → invoice with correct total |
| [ ] | 5.2 | Payments (cash/card/mobile), partial payments | Invoice becomes `paid`; math is exact |
| [ ] | 5.3 | Patient portal (own appointments, visits, bills) | Patient sees only own data (RLS check!) |
| [ ] | 5.4 | Role-aware dashboard | Each role sees relevant counts |

---

## Phase 6 — PWA & Hardening (Week 6)

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 6.1 | Manifest + icons + installable | "Add to Home Screen" in Chrome |
| [ ] | 6.2 | Service worker — offline shell | Open app on airplane mode → shell + message loads |
| [ ] | 6.3 | Mobile pass on a real phone | Full golden path on a phone browser |
| [ ] | 6.4 | Security review | Patient account cannot see others' data; no leaked keys; env handled |

---

## Phase 7 — Launch (Week 7)

| Done? | Step | Deliverable | How to test |
|---|---|---|---|
| [ ] | 7.1 | E2E golden-path tests (Playwright) | `npx playwright test` green |
| [ ] | 7.2 | CI: typecheck + lint + tests + build on every push | GitHub Actions green |
| [ ] | 7.3 | Deploy to Netlify with real Supabase credentials | Live URL works |
| [ ] | 7.4 | Launch checklist + smoke test | Golden path on the live URL, on a phone |

---

## Golden Path Checklist (the ultimate gate — run before calling anything "launchable")

- [ ] Receptionist adds a patient
- [ ] Appointment booked (free slot), no double-booking possible
- [ ] Doctor checks in and completes the visit with a prescription
- [ ] Billing issues an invoice and records payment
- [ ] Patient sees the appointment, visit, and bill — and nothing else
- [ ] All of the above works on the **live URL** on a **phone**

---

*How to use: check a box only when `Architecture-essential.md` §6 "Definition of Done" passes.
Update "Last updated" and the overall status line every time.*