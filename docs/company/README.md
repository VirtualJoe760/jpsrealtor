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
| `/invest` | Investor summary for the planned pre-seed round: **$3M for 15%** (implied $20M post-money) | booking a consultation |
| `/support` | One-time Stripe contribution (gift) | contributing |

The sidebar shows **Mission · Join Us · Invest** above Privacy · Terms, on the
**platform host only** (`LegalLinks showCompany={isPlatformHost}`). On an agent's
own site those links would read as the agent's company. The routes themselves
resolve on any host. `/support` is linked from `/mission`, not the sidebar.

Shared frame + signed-out prompt: `src/app/components/company/CompanyShell.tsx`
(`AccountGate` shows "Create an account" / "Sign in" and returns via `?from=`).

## Investment consultations — no money, by design

`/invest` operates under Reg CF **testing the waters** (17 CFR 227.206): the
company may describe a planned offering and talk with prospective investors,
but may not accept money or commitments until a Form C is filed and the round
runs through a registered funding portal. So:

- The page books a **30-minute investment consultation** instead of asking how
  much someone would invest (`src/app/invest/ConsultationBooker.tsx`). It
  reuses the public booking pipeline — `/api/agent/public` (resolves to the
  platform owner on chatrealty.io) → `/api/appointments/available-slots` →
  `/api/appointments/book` — so the meeting lands on the owner's Google
  Calendar, creates a CRM contact and sends the normal booking notification.
  Type is `consultation` (the Appointment enum has no investor type); the
  message starts with `[Investment consultation]` to mark it.
- An earlier amount-based interest form (`/api/invest/interest`,
  `investor_interest`) was removed 2026-10-28 at Joseph's request; it had no
  submissions.
- The page carries the required legend. Do not add a payment button or an
  amount field to `/invest`.

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
