---
title: Company pages (Mission, Join Us, Invest, Support)
status: current
last_verified: 2026-11-02
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
| `/ai-classes` | Book an in-office AI class for a brokerage (Claude Code / Codex, AI content tools, ChatRealty) | nothing (public booking) |

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

## AI classes (`/ai-classes`)

Added 2026-11-02. Part of the sales motion: Joseph teaches AI classes
(ChatRealty, Claude Code / Codex, AI content tools) in person at brokerage offices. Every class covers all three — there is no topic picker. Linked from
the platform homepage (`/chat-landing`, "Book an AI Class").

Rules and intake options live in **`src/config/ai-classes.ts`** — the form and
the book route both read it:

- **Southern California only** (`SOCAL_COUNTIES`). "Outside Southern
  California" stops the form with a note to email support@chatrealty.io.
- **Booked at least 7 days out** (`AI_CLASS_LEAD_DAYS`), weekdays, 21-day
  window (lead + window must stay inside the owner's 30-day `advanceBookingDays`, or later days show no times). Classes run **60–90 minutes**; slots block **90** on the calendar.
- **2 hours between classes** (`AI_CLASS_GAP_MINUTES`). Free/busy only prevents overlap, so `src/lib/ai-class-schedule.ts` checks booked `ai-class` Appointments: `available-slots?type=ai-class` hides start times inside the gap and the book route rejects them (409).
- The book route re-checks county, lead time and required fields for
  `type: "ai-class"`, so a hand-made request can't skip them.

Flow (`src/app/ai-classes/AiClassBooker.tsx`):

1. **Intake** — requester (name, role, email, phone); office (brokerage,
   branch, address, city, county, agents in office, expected attendees, AI
   experience); day-of point of contact (defaults to the requester; name + phone required, also checked server-side); presentation room (type, seats, yes/no/not-sure for TV,
   Apple TV, projector, HDMI, Wi-Fi, power, laptops; room description;
   parking/access).
2. **Schedule** — month-view calendar, then open start times from the owner's
   Google Calendar via the same public pipeline as `/invest`
   (`/api/agent/public` → `available-slots` → `appointments/book`).

**Confirmation email** — `sendAiClassConfirmationEmail` in
`src/lib/email-resend.ts`, sent from the book route for `type: "ai-class"`.
From `ChatRealty <noreply@chatrealty.io>` (`platformFrom()`, never agent-
branded), reply-to `ADMIN_EMAIL`, wrapped in `renderBrandedEmail`. Shows
when/where/point of contact and a prep list built from the room answers (screen,
Wi-Fi, laptops). Awaited so serverless doesn't drop it; failure is logged and
never fails the booking. The Google Calendar invite is separate.

The booking creates the calendar event (title `AI Class: <brokerage> — <name>`,
office address as location, full intake in the description), a CRM contact and
the SMS alert. The intake is stored structured on `Appointment.aiClass`
(declared in the schema field by field). No account required, unlike
`/invest`: the booker is usually an office manager new to ChatRealty.

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
