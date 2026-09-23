# Life Blossom — MiMo Working Notes

> **Plain-language summary:** This is the AI assistant's memory. It is written for MiMo (and any
> other AI agent) to pick up instantly where the last session left off. It holds the current
> state, decisions we've made, gotchas we learned, and what to do next. Keep it updated — it is
> the cheapest insurance against "AI amnesia" between sessions.

---

## 1. Session Start (read these every time, in order)

1. `stages-of-completion.md` — where the project stands, what's checked off
2. `MiMo.md` (this file) — context, decisions, gotchas, next steps
3. `Agents.md` — the rules
4. `git status` — what's already dirty
5. Then state a 1–3 bullet plan to the founder before touching code

---

## 2. Current State (updated: 2026-09-04)

| Area | Status |
|---|---|
| Product docs | ✅ Done — `Prd.md`, `Architecture.md`, `Architecture-essential.md`, `Agents.md`, `MiMo.md`, `resourcing-and-projections.md`, `stages-of-completion.md` all created |
| Next.js app scaffold | ⬜ Not started |
| Supabase project + migrations | ⬜ Not started |
| Auth | ⬜ Not started |
| Core features (appointments, visits, billing) | ⬜ Not started |
| PWA | ⬜ Not started |
| Deployment (Netlify) | ⬜ Not started |

**In short: we are at Phase 0 — "write the docs" — and the next milestone is Phase 1,
"scaffold the app" (Step 1 of `Architecture-essential.md` §4).**

---

## 2b. Fixes applied 2026-09-10 (login + admin portal)

- **Remote DB `is_admin()` was corrupted** (failed with `cannot cast type boolean to
  user_role`) — broke every RLS query on `organizations`/`users` for non-admins:
  patient login, `/api/auth/me`, and the admin sidebar (it rendered empty). Fixed via
  migration `20260910000001_fix_role_helper_functions.sql` (recreates `is_admin`,
  `is_staff`, `is_accounting`, `user_org_id` from migration 0002).
- **Wrong hardcoded org id** (`a0000000-0000-0000-0000-000000000001`) in
  `register`, `callback`, `setup-super-admin` routes → new signups/Google login broke.
  Now resolved via `getDefaultOrgId()` in `src/lib/org-settings.ts`.
- **Patient Login gate restored**: middleware no longer force-redirects logged-in users
  away from `/login` (it was bouncing them to `/admin`). See `src/lib/supabase/middleware.ts`.
- **Sidebar role lists cleaned** in `role-access.ts` / `rbac.ts` (removed duplicated
  `"admin"` entries left by a botched role rename).
- **Admin access restored**: `admin@lifeblossom.com.ng` password reset to
  `DemoPass123!` (documented demo); `olalekan.edun@gmail.com`'s missing `users` row
  restored via migration `20260910000002_fix_super_admin_profile.sql`.
- ⚠️ Open items: `adeolu.adesanya@gmail.com` has an **unconfirmed email** (cannot sign
  in until confirmed — confirm via Supabase Auth). The `setup-super-admin` route
  hardcodes `olalekan.edun@gmail.com` / `Obadina11@` in source — change/remove before
  the repo ever goes public. `delete.txt` at repo root contains the DB password — keep
  it out of any commit.

---

## 3. Decisions Log (locked unless the founder changes them)

| # | Decision | Why | Locked? |
|---|---|---|---|
| D1 | Next.js **App Router + TypeScript**, Tailwind CSS | Fast, typed, beginner-friendly, standard | ✅ |
| D2 | **Supabase** (Postgres + Auth + RLS) | Free tier, RLS security, managed backups | ✅ |
| D3 | Deploy on **Netlify** (free tier) | Free hosting + HTTPS + CDN; user preference | ✅ |
| D4 | **PWA** for installability + offline shell | No app-store approval; works on phones | ✅ |
| D5 | Roles: `admin`, `doctor`, `receptionist`, `billing`, `patient` | Matches hospital staffing reality | ✅ |
| D6 | Roles assigned by **admins only**; patients self-signup | Security — no privilege escalation | ✅ |
| D7 | **RLS on every table** — the security model, not the UI | Data protection is enforced by the DB | ✅ |
| D8 | Migrations = source of truth (`supabase/migrations/`) | Reproducible, reviewable schema | ✅ |
| D9 | Golden path first: **appointments → visits → prescriptions → billing** | Smallest useful product | ✅ |
| D10 | MVP = the 7 tables in `Architecture-essential.md` §2.1; **no extras** | Scope control for a solo founder | ✅ |
| D11 | Money = Postgres `numeric`, store computed amounts | No floating-point money bugs | ✅ |
| D12 | PWA offline = shell only (read cached, writes blocked with message) | Offline writes are a later, complex phase | ✅ |

---

## 4. Gotchas & Hard-Won Lessons (read before touching these areas)

1. **Supabase Free projects PAUSE after 7 days of inactivity.** The app appears down until you
   open the Supabase dashboard and unpause. Before launch: either log in weekly, or accept Pro
   ($25/mo) as the first real cost. Keep this in every cost conversation.
2. **The anon key is public** and that's fine — RLS is what protects data. The
   **service_role key must never** appear in client code or `NEXT_PUBLIC_*`.
3. **RLS is subtle:** policies apply to *every* query. A policy that says `using (true)` for
   `select` on `patients` makes every logged-in user able to read all patients — usually wrong.
   Test each policy as a patient account.
4. **App Router gotcha:** server components can't use `useState`/effects; client components need
   the `"use client"` directive. When a page needs interactivity, split it: server component for
   data, small client components for the interactive bits.
5. **Server Actions are POST-only** and must be in a file marked `"use server"`. Validate every
   input with Zod — actions are exposed to the network like any API.
6. **Time zones:** store `timestamptz`; display in clinic local time. Booking slots must be
   compared in the same timezone or double-booking slips through.
7. **The double-booking UNIQUE constraint** `(doctor_id, scheduled_at)` lives in the DB.
   The UI's free/busy grid is convenience; the constraint is the truth.
8. **`npm run build` on Netlify must pass** or the deploy fails — always build locally first.
9. **Free-tier limits to respect:** Supabase 500 MB DB / 1 GB storage / 50k monthly active
   users; Netlify 100 GB bandwidth / 300 build-minutes/month. Fine for launch; watch the numbers.
10. **Windows quirk:** this repo lives under a Windows user folder; use Git Bash-style commands
    in terminals (POSIX syntax works in bash on Windows).

---

## 5. Command Cheatsheet (copy-paste safe)

```bash
# Scaffold the app (Phase 1, step 1)
npx create-next-app@latest life-blossom --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Run the dev server (test everything while developing)
npm run dev

# Typecheck / lint / test / build (the "am I done?" gate)
npx tsc --noEmit
npm run lint
npm test
npm run build

# Supabase CLI (Phase 1, step 2)
npx supabase init
npx supabase start          # local Postgres + Auth + Studio
npx supabase db push        # apply migrations to the remote project
npx supabase db seed        # load seed data

# Deploy (Phase 1, step 12)
# push to GitHub → connect repo to Netlify → auto-deploy on every push
```

---

## 6. Next Steps (the immediate plan)

1. **Phase 1 · Step 1 — Scaffold:** run `create-next-app`, set up folders per
   `Architecture.md` §3, commit nothing until the founder reviews.
2. **Phase 1 · Step 2 — Supabase:** create the project, write migration 0001 (the 7 tables +
   RLS), apply locally, verify policies with a throwaway patient account.
3. **Phase 1 · Step 3 — Auth:** login page, signup, `middleware.ts` guard, profiles trigger.
4. Continue down the table in `Architecture-essential.md` §4, checking off
   `stages-of-completion.md` as each step lands.

**Open question for the founder:** does MVP include **billing** (invoices + payments), or does
billing wait for phase 2? It changes which tables ship in migration 0001. Default plan:
*include* billing, per the PRD — confirm before we build it.

---

## 7. Style Guide for MiMo's Responses

- Lead with the result, then the plain-language why, then the exact test command.
- Keep explanations beginner-sized. Define one term per sentence max.
- Small diffs, one task at a time, ask before new dependencies or destructive commands
  (full rules in `Agents.md`).
- End each finished task by updating this file's "Current State" and `stages-of-completion.md`.

---

*Last updated: 2026-09-04 — Keep this file short enough to read in 60 seconds.*