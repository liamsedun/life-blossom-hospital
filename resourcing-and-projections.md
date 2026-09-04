# Life Blossom — Resourcing & Projections

> **Plain-language summary:** Who does the work, how long it takes, and what it costs.
> This plan is built for one founder + AI agents, with a 5–7 week build, launching on the
> **free tiers** of Supabase and Netlify (total: **$0/month** at launch).

---

## 1. The Team

There is one human and a set of AI tools. We plan around that honestly.

| Role | Who | What they do |
|---|---|---|
| **Founder / Product Owner** | You | Decide what gets built, test as the end user, approve every change, hold the passwords |
| **Engineering (AI agent)** | Claude / Codebuff / MiMo | Write code, run typecheck/tests, explain changes, follow `Agents.md` |
| **Architect / Reviewer** | AI agent + you | Keep scope in check (`Architecture-essential.md`), review diffs, verify RLS |
| **QA (human-in-the-loop)** | You | Follow the Golden Path each week; the agent cannot truly "feel" the app |
| **DevOps** | Mostly automated | Supabase handles the database; Netlify handles hosting; Git handles deploys |
| **Design** | You + AI | Tailwind + a small tasteful palette; **no custom design system** — use defaults first |

**What this means:** no hiring, no contractors. The 5–7 week plan assumes ~**5–10 focused hours
per week** from the founder (reviewing, testing, deciding) with the AI doing the bulk of the
coding between sessions.

---

## 2. Timeline (5–7 weeks to a live MVP)

> Each week ends with a **working, testable thing**. If a week slips, we slip the *next* week —
> never add scope mid-build.

### Week 1 — Foundation
- Scaffold Next.js + Tailwind + folders
- Supabase project + migration 0001 (tables + RLS) + seed data
- Login, signup, route guard
- **Test:** sign in as admin, doctor, receptionist, patient

### Week 2 — People & Places
- Departments CRUD (admin)
- Doctors CRUD (admin)
- Patients CRUD + search (receptionist)
- **Test:** receptionist adds a patient in under 2 minutes

### Week 3 — Appointments (the heart)
- Book appointment with free/busy slot picker
- List, cancel, check-in
- Double-booking blocked by the DB
- **Test:** Golden Path steps 1–3

### Week 4 — The Clinical Visit
- Doctor schedule view
- Visit screen: symptoms → diagnosis → notes → prescription
- **Test:** Golden Path steps 4–5 (doctor completes a full visit)

### Week 5 — Billing & Patient Portal
- Invoices from completed visits, line items, payments
- Patient portal (own appointments, visits, bills)
- Role-aware dashboard
- **Test:** Golden Path complete — a bill gets paid end-to-end

### Week 6 — PWA & Hardening
- Manifest, icons, service worker (offline shell)
- Mobile pass on a real phone
- Security review: verify RLS as a *patient*, check env handling, no leaked keys
- **Test:** install on a phone, open it offline, use the full flow on mobile data

### Week 7 — Launch
- E2E tests (Playwright, golden path)
- `npm run build` + lint + tests green on CI
- Deploy to Netlify with real Supabase credentials
- Smoke-test the live URL; document launch checklist
- **Test:** the live URL works on your phone

**Buffer:** Weeks 4–5 are the most likely to overrun (clinical + money logic). The plan has
built-in slack at Week 7 and assumes scope discipline from `Architecture-essential.md`.

---

## 3. Cost Plan — $0 at launch

### 3.1 Supabase — Free Plan (the database, auth, security)

| Item | Free plan | Your usage estimate | Fit? |
|---|---|---|---|
| Database | 500 MB | < 50 MB for years of a small clinic | ✅ plenty |
| Auth (monthly active users) | 50,000 MAU | hundreds | ✅ plenty |
| Storage | 1 GB | 0 (no uploads in MVP) | ✅ |
| Backups | Daily, 7-day retention | — | ✅ |
| Projects | 2 | 1 staging + 1 production | ✅ |
| **Auto-pause** | **Pauses after 7 days of inactivity** | dev-only traffic | ⚠️ **watch this** |

**The one trap:** a free Supabase project that nobody touches for 7 days **pauses** and the app
appears down until you unpause it from the dashboard. Before real launch, either expect to log
in weekly, or switch to Pro.

**Upgrade to Pro ($25/month) when:** you launch with real patients, need >7-day backups, need
more storage, or the pause risk is unacceptable. Do not upgrade before launch — it would be
paying for scale you don't have.

### 3.2 Netlify — Free Plan (hosting, HTTPS, CDN, deploys)

| Item | Free plan | Your usage | Fit? |
|---|---|---|---|
| Bandwidth | 100 GB/month | small clinic traffic | ✅ plenty |
| Build minutes | 300/month | ~10–30 per deploy | ✅ fine at our cadence |
| HTTPS + CDN | Included | — | ✅ |
| Concurrent builds | 1 | 1 | ✅ |
| Custom domain | Supported | — | ✅ |

**Upgrade to Pro ($19/month) when:** you exceed ~100 GB bandwidth, need more build minutes, or
want priority support / better analytics. Unlikely in year one.

### 3.3 Everything else

| Item | Cost |
|---|---|
| Supabase Free | $0 |
| Netlify Free | $0 |
| Custom domain (`lifeblossom.example`) | ~$10–15/year |
| Email sending (later — booking confirmations) | Resend free tier: $0 up to 3,000 emails/mo |
| Monitoring (later) | UptimeRobot free tier: $0 |
| **Total monthly (launch)** | **$0** |
| **Total yearly (launch)** | **~$10–15** (domain only) |

### 3.4 Cost projection if we scale

| Stage | When | Monthly |
|---|---|---|
| Launch | Now | **$0** |
| Real patients | First clinic goes live | $0 (stay free, watch limits) |
| Comfort + reliability | Daily backups beyond 7 days, no auto-pause | $25 (Supabase Pro) |
| Heavy traffic | Bandwidth > 100 GB or need analytics | +$19 (Netlify Pro) |
| Notifications at scale | Email > 3k/mo | +$20 (Resend) |
| **Realistic year-2 budget** | — | **~$45–65/month** |

> **Rule of thumb:** stay on free until a limit *hurts*. Paying early is the classic solo-founder
> money leak. Every upgrade above has a trigger condition, not a date.

---

## 4. Risk & De-risking

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scope creep (the #1 killer) | High | `Architecture-essential.md` is the contract; the "do NOT build" list is a sticky note |
| Supabase free pause at launch | Medium | Weekly login during dev; Pro ($25) before go-live if it matters |
| Founder loses momentum | Medium | 5–10 hrs/week plan; each week ends with a visible, testable thing |
| AI builds something the founder can't understand | Medium | `Agents.md` §6: plain-language explanations, small diffs, test commands every time |
| RLS misconfiguration leaks data | Medium | Every table verified with a patient account; policies in code review; never ship a table without policies |
| Billing logic bugs (money math) | Low-Med | Postgres `numeric`, stored computed amounts, unit tests on price math |
| Single point of failure (one founder) | Low | Docs (`Prd.md`, `Architecture.md`, `MiMo.md`) let anyone — or any AI — take over the project |

---

## 5. Weekly Operating Rhythm

1. **Session start:** agent reads `stages-of-completion.md` + `MiMo.md` (60 seconds, ritual).
2. **Work:** one step from `Architecture-essential.md` §4, small diffs.
3. **Verify:** agent runs typecheck/lint/tests/build; **founder tests as the end user** with the
   command the agent gives them.
4. **Record:** update `stages-of-completion.md`, log decisions/gotchas in `MiMo.md`.
5. **End of week:** founder decides the next week's single goal from the timeline above.

---

*Last updated: 2026-09-04 — Costs are current for Supabase & Netlify free plans as of this date;
re-check the pricing pages before launch.*