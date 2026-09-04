# Life Blossom — Rules for AI Coding Agents

> **Plain-language summary:** This file is a contract between the human and any AI agent
> (Claude, Codebuff, MiMo, Copilot, Cursor, ...) working in this repository. If you are an AI
> agent, treat every rule below as **mandatory**, not as a suggestion. If a rule conflicts with
> the user's request, ask the user before proceeding.

---

## 1. The Human Is the Product Owner

1. **Never commit, push, or deploy** unless the human explicitly asks you to.
2. **Never run destructive commands** (`git reset --hard`, `git clean`, `drop table`,
   deleting files, mass renames) without explicit permission.
3. **Never touch the production Supabase project** (the one with real data) unless asked.
   Work against a local (`supabase start`) or a clearly-labeled staging project by default.
4. **Ask before adding any new dependency.** The stack is deliberately small
   (see `Architecture.md` §1). A dependency needs a sentence explaining why it earns its place.
5. **Ask when the request is ambiguous or the options have different consequences.**
   Guessing wrong on security or data shape wastes more than a question costs.
6. **Respect the human's skill level.** The founder is a beginner. Explain *what* you changed
   and *why* in plain language, in a few sentences. Never dump a wall of jargon.

---

## 2. Small, Safe Changes

1. **Make the smallest change that satisfies the request.** No refactoring "while you're in there."
2. **One task per session by default.** If the request contains several tasks, do them in order
   and check in after each one.
3. **Never rewrite a file wholesale** when a targeted edit works. Preserve the author's style.
4. **Never "improve" code unrelated to the task** (renaming, reformatting, reordering).
   If something is genuinely broken, say so and ask before fixing it as a side quest.
5. **Match existing conventions** — folder structure, naming (`snake_case` DB, `camelCase`
   TS variables), component patterns. See `Architecture.md` §3 and §6.

---

## 3. Security — Non-Negotiable (these are not optional)

1. **RLS is the security model.** Every table ships with Row Level Security enabled and
   policies defined. If you add a table without policies, you have broken the rules —
   and possibly the law. Stop and fix it.
2. **The `SUPABASE_SERVICE_ROLE_KEY` never appears in client code, in `NEXT_PUBLIC_*` env vars,
   in commits, or in logs.** It is server-only. If you suspect a leak, tell the human immediately.
3. **Never write secrets, tokens, or keys into any file** that could be committed
   (`.env.local` is git-ignored; `.env.example` contains placeholders only).
4. **Never trust client input.** Every write goes through a Server Action validated with a Zod
   schema. No raw `req.body` into the database, no `dangerouslySetInnerHTML` with user data.
5. **Never allow a user to choose their own role** or escalate privileges. Roles are assigned
   by admins only, server-side.
6. **When you write a query, assume the client is malicious.** RLS must be the last line of
   defense, and it must hold.
7. **UUID primary keys everywhere.** No auto-increment IDs exposed in URLs.

---

## 4. Quality Bar — What "Done" Means

Every change must leave the repo green:

1. Run **all three** after any code change and fix anything you broke:
   - `npx tsc --noEmit` (typecheck)
   - `npm run lint` (lint)
   - `npm test` (unit tests) — add or update tests for new logic
2. `npm run build` must succeed before you call the task complete.
3. **Tell the human the exact command to run** to see/verify the change
   (e.g. `npm run dev` then open `http://localhost:3000/appointments`).
4. **Test the change as the end user**, not as admin:
   - verify RLS by checking that a `patient` cannot see another patient's data
   - verify the golden path (`Architecture-essential.md` §1) still works
5. No `any` types. No `@ts-ignore`. No `console.log` left in committed code (debug logs are
   fine during a session; remove them before finishing).
6. **Update the docs** when behavior or schema changes: `stages-of-completion.md` (check boxes),
   and note meaningful decisions in `MiMo.md` (decisions log).

---

## 5. Database Changes

1. **All schema changes are migrations** in `supabase/migrations/` — ordered files, one per
   change, never edited after they are applied. Never hand-edit the remote database schema.
2. **Before migrating:** show the human the SQL briefly and say what it does.
3. **Migrations are additive where possible** — prefer adding columns/tables over altering or
   dropping. Destructive changes require explicit permission and a backup.
4. **Seed data** (`supabase/seed.sql`) must reproduce a realistic demo (roles, departments,
   doctors, patients, appointments) so the app is testable on day one.
5. **Indexes** go in the same migration as the table they serve (see `Architecture.md` §10).

---

## 6. Working with the Founder (how to communicate)

1. **Lead with the result** — one or two sentences on what changed and why, then the test command.
2. **Use plain words.** If you must use a technical term, define it in one short parenthetical.
3. **When something is risky or uncertain, say so honestly** — don't bury caveats.
4. **Propose, don't lecture.** If you see a better approach, describe it briefly and let the
   human decide.
5. **Keep diffs reviewable** — the human reads every change, so prefer 20 lines over 200.
6. **Never claim a test passed if you didn't run it.** Never say "it should work" — run it.

---

## 7. Session Ritual (every session, first 2 minutes)

1. Read `stages-of-completion.md` → know where the project stands.
2. Read `MiMo.md` → pick up the working notes and decisions from the last session.
3. Read `Agents.md` (this file) → re-anchor the rules.
4. Check `git status` → know what is already dirty before you touch anything.
5. State your plan (1–3 bullets) before writing code.

---

*Last updated: 2026-09-04 — If in doubt, ask the human. When the human says "just do it", do the
smallest safe version and report.*