---
title: Affiliate program (recurring commissions on agent subscriptions)
status: current
last_verified: 2026-11-02
related: [./README.md, ./stripe-billing.md, ./transactions-and-partnerships.md, ../multi-tenant/site-platform-plan.md]
---

# Affiliate program

## TL;DR

Anyone with an account can apply to be an affiliate (partners section,
`/partner/affiliate`). Joseph approves by hand in **Admin → Affiliates**; the
approval email carries the affiliate's code and link `chatrealty.io/?ref=CODE`.
A click sets a 90-day first-party cookie (**last click wins**); the cookie is
stored on the `User` at signup and refreshed at checkout, then locked onto
`AgentSubscription.referredBy` once the agent subscribes. Every paid
subscription invoice of a referred agent creates an `AffiliateCommission` row
at the affiliate's current tier rate. Rows become payable 30 days later, and
are paid monthly through **Stripe Connect Express** once the balance is $50+.
Refunds and chargebacks reverse them. **Subscriptions only.** Built as P6 of
the [site-platform plan](../multi-tenant/site-platform-plan.md).

**Not launched.** Transfers are off until `AFFILIATE_PAYOUTS_ENABLED=true`, and
the terms need a counsel check first (see Compliance).

## Rules (all in `src/config/affiliates.ts`)

| Rule | Value | Decided |
|---|---|---|
| Rate | Flat $/agent/month, every month the agent pays | Joseph 2026-11-02 |
| Tiers | 1–9 $5 · 10–24 $8 · 25–49 $12 · 50–99 $15 · 100–199 $20 · 200+ $25 | Joseph 2026-11-02 |
| Tier count | **Currently paying** agents (`AgentSubscription.status: active`, paid tier). Trials, past-due, cancelled don't count | A7 |
| Tier scope | Tier rate applies to **all** the affiliate's paying agents | A8 |
| What earns | Agent plan subscription invoices only (not Pro, domains, credits, ad spend) | A5 |
| Attribution | 90-day cookie `cr_aff`, **last click** wins until the subscription is attributed, then locked | A4, Joseph 2026-11-02 |
| Refund hold | 30 days after the agent's payment | A6 |
| Payouts | Monthly on the 15th (UTC), if payable balance ≥ $50; smaller balances roll over | A6 |
| Who can join | Anyone, after Joseph approves (no auto-approve) | A3 |

**How the tier applies in time:** the rate is computed when each invoice is
paid, from the paying-agent count at that moment (the paying agent included).
Reaching 10 lifts every agent's *next* invoice to $8; invoices already recorded
keep their rate. The row stores `ratePerAgent` and `payingAgentsAtInvoice` so
every amount is auditable. A commission never exceeds what the agent paid on
that invoice; annual invoices pay 12 months at once.

## Files

| File | Purpose |
|---|---|
| `src/config/affiliates.ts` | Tiers, windows, minimum, payout day, terms version, code format |
| `src/models/Affiliate.ts` | Application, status, code, rate override, Connect account, click count |
| `src/models/AffiliateCommission.ts` | The ledger. Unique on `(stripeInvoiceId, kind=commission)`; clawbacks unique per reversed row |
| `src/models/AffiliatePayout.ts` | One Stripe transfer; unique per affiliate per month per mode |
| `src/models/User.ts` → `affiliateReferral` | `{ affiliateId, code, capturedAt, source: signup\|checkout }` |
| `src/lib/affiliates.ts` | All affiliate logic: clicks, `captureReferral`, `recordInvoiceCommission`, `reverseCommissionForPayment`, Connect onboarding, `runAffiliatePayouts`, dashboard summary |
| `src/app/components/AffiliateRefCapture.tsx` | In the root layout; posts `?ref=` to the track route |
| `src/app/partner/affiliate/page.tsx` | Apply form → pending → dashboard |
| `src/app/admin/affiliates/page.tsx` | Queue, pause/resume/terminate, rate override, ledger |
| `src/app/affiliate-terms/page.tsx` | Terms; numbers render from the config |
| `src/lib/email-resend.ts` | `sendAffiliateApplicationReceivedEmail`, `…AdminNotification`, `sendAffiliateApprovalEmail`, `sendAffiliateRejectionEmail` — all `renderBrandedEmail` + `platformFrom()` |

## Routes

| Route | Auth | What |
|---|---|---|
| `POST /api/affiliate/track` | **Public** (`PUBLIC_API_EXACT` in `src/proxy.ts`), 30/h per IP | Counts the click, sets `cr_aff` (httpOnly, lax, 90 days) |
| `POST /api/affiliate/apply` | Session | Creates/re-opens an application; emails applicant + admin |
| `GET /api/affiliate/me` | Session | Record + dashboard numbers; refreshes Connect status |
| `POST/GET /api/affiliate/connect` | Session, approved/paused | Express onboarding link / Express dashboard login link |
| `GET/PUT /api/admin/affiliates` | Admin | List; `approve` (assigns code, sends email), `reject`, `pause`, `resume`, `terminate`, `setRate`, `notes` |
| `GET /api/admin/affiliates/[id]` | Admin | Full ledger + payouts |
| `GET /api/cron/affiliate-payouts` | `CRON_SECRET` / `x-internal-secret` | Daily 17:00 UTC (vercel.json): promote matured rows; transfer on payout day. `?force=1` runs payouts off-day |

## Attribution flow

1. Visitor lands on any page with `?ref=CODE` → `AffiliateRefCapture` → track
   route. Unknown, pending, rejected or terminated codes are ignored. Same code
   again isn't a new click.
2. **Signup** — `POST /api/auth/register` and the Google/Facebook `signIn`
   callback in `src/lib/auth.ts` call `captureReferral(user, cookie, "signup")`.
3. **Checkout** — `POST /api/stripe/checkout` calls `captureReferral(…,
   "checkout")` (a newer click replaces the signup one) and passes
   `affiliateId` into the Stripe subscription metadata.
4. **Webhook `checkout.session.completed`** sets
   `AgentSubscription.referredBy = affiliate.userId`. From here attribution is
   locked: `captureReferral` refuses to change it.

Self-referral is refused at every step.

## Ledger and webhook events

`POST /api/webhooks/stripe`:

| Event | Affiliate effect |
|---|---|
| `invoice.paid` | `recordInvoiceCommission` — primary path; a failure returns 5xx so Stripe retries |
| `invoice.payment_succeeded` | Same call, best-effort, in case `invoice.paid` isn't enabled on the endpoint. The unique index makes the second one a no-op |
| `charge.refunded` (full) | `reverseCommissionForPayment`: pending/payable → `reversed`; already paid → negative `clawback` row (payable) that nets against the next payout. Partial refunds: logged, manual review |
| `charge.dispute.created` | Same reversal, reason `chargeback` |

The first invoice can arrive before `checkout.session.completed`, so the
commission resolves the affiliate from, in order: `AgentSubscription.referredBy`,
the subscription's `metadata.affiliateId`, then `User.affiliateReferral`. The
payment intent is looked up via `stripe.invoicePayments.list` and stored on the
row so refunds/disputes can find it.

Status: `pending` → (`payableAt` passes, cron) `payable` → (transfer)
`paid`; or `reversed`. Paused affiliates still accrue but aren't paid;
terminated and rejected affiliates earn nothing new.

## Payouts (Stripe Connect Express)

- The affiliate clicks **Set up payouts** → we create an Express account
  (`transfers` capability, US) and send them to Stripe's hosted onboarding
  (identity, bank, W-9). Status is pulled with `accounts.retrieve` on
  dashboard load and before each payout — no Connect webhook endpoint needed.
- Accounts are per Stripe mode: an account made with test keys is replaced by
  a new one when keys are live (`stripeConnectLivemode`).
- Payout run: sum the affiliate's `payable` rows (clawbacks net), skip if
  under the minimum, create the `AffiliatePayout` row first, then
  `transfers.create` with an idempotency key from that row. Transfers draw on
  the platform's Stripe balance.
- **Before launch, in the Stripe dashboard:** enable Connect (live), turn on
  1099 tax reporting for Express accounts, add `invoice.paid` and
  `charge.dispute.created` to the webhook endpoint, set
  `AFFILIATE_PAYOUTS_ENABLED=true`. Connect Express costs the platform about
  $2 per active account per month plus per-payout fees.

## Compliance

Commissions are paid **only on ChatRealty subscription revenue**, never tied to
a real-estate transaction, lead or closing: paying an unlicensed person for a
real-estate referral is a DRE problem, and tying pay to settlement-service
business is a RESPA §8 problem. `recordInvoiceCommission` checks the invoice is
an agent-plan subscription and nothing else calls it. Applicants who hold a
real-estate, mortgage, title or escrow license are flagged (`licensed` badge
in admin). Affiliates must agree to disclose they're paid (FTC); the terms
require the disclosure next to the link. **The terms page is a draft — get a
counsel check before launch**, especially for licensed affiliates.

## Testing (Stripe test mode)

`scripts/test-affiliate-flow.ts` runs the whole loop against the test-mode
Stripe account and the dev database: creates an affiliate + approval, a test
agent with the cookie captured, a real test-mode subscription paid with
`pm_card_visa`, then feeds the paid invoice to `recordInvoiceCommission` and
checks the row and the dashboard summary. It refuses to run with live keys.
