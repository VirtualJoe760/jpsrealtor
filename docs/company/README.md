---
title: Company pages (Mission, Join Us, Invest, Support)
status: current
last_verified: 2026-10-28
related: [../ARCHITECTURE.md]
---

# Company pages

ChatRealty-the-company pages, added 2026-10-28.

| Route | What it is | Account needed for |
|---|---|---|
| `/mission` | Mission statement | nothing (public read) |
| `/join` | Open roles + application form, then the agent pitch → `/agent/settings` | applying; the agent "get started" step |
| `/invest` | Investor summary for the planned pre-seed round: **$3M for 15%** (implied $20M post-money) | reserving interest |
| `/support` | One-time Stripe contribution (gift) | contributing |

The sidebar shows **Mission · Join Us · Invest** above Privacy · Terms, on the
**platform host only** (`LegalLinks showCompany={isPlatformHost}`). On an agent's
own site those links would read as the agent's company. The routes themselves
resolve on any host. `/support` is linked from `/mission`, not the sidebar.

Shared frame + signed-out prompt: `src/app/components/company/CompanyShell.tsx`
(`AccountGate` shows "Create an account" / "Sign in" and returns via `?from=`).

## Investor interest — no money, by design

`/invest` operates under Reg CF **testing the waters** (17 CFR 227.206): the
company may describe a planned offering and collect **non-binding** interest,
but may not accept money or commitments until a Form C is filed and the round
runs through a registered funding portal. So:

- `POST /api/invest/interest` stores `{ amount, note }` in `investor_interest`
  (`src/models/InvestorInterest.ts`, one doc per user, upserted) and emails the
  admin (`sendInvestorInterestNotification`). Nothing is charged.
- The page carries the required legend. Do not add a payment button to `/invest`.

## Contributions (`/support`)

`POST /api/support/checkout` creates a Stripe Checkout session (`mode: payment`,
`submit_type: donate`, `metadata.type: support_contribution`), $5–$10,000.
It is a gift: no equity, credits or rewards, not tax deductible. It is a
separate page because a payment button beside the testing-the-waters legend
("no money is being solicited") would contradict it.

The Stripe webhook needs no case: it only fulfils `points_topup` payments and
`subscription` checkouts, so a contribution is recorded as processed and
ignored. The Stripe dashboard is the ledger.

## Careers (`/join`)

Roles and their **five screening questions each** live in
`src/config/careers.ts` — edit there; the page and the API both read it.
Open roles (2026-10-28): Fundraising & Investor Relations Lead, Data Engineer,
Real Estate Attorney — Data & Technology, Operations Officer (COO).
`/join?role=<slug>` preselects a role and scrolls to the form.

`POST /api/careers/apply` (multipart, signed-in) requires a résumé (PDF/Word,
≤3 MB), a cover letter (typed, or a file ≤1 MB) and all five answers. It saves
to `job_applications` (`src/models/JobApplication.ts`, one per user per role)
and emails the admin with the files attached.

- **Files are stored in Mongo, not Cloudinary.** Résumés are personal data and
  Cloudinary uploads here are public URLs. `data` is `select: false`.
- **4 MB total** because Vercel rejects request bodies over 4.5 MB before the
  route runs.
- There is no admin screen for applications yet; the email is the inbox.
