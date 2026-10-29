---
title: Agent Onboarding (apply → pay → verify ID → admin confirms site)
status: current
last_verified: 2026-10-28
related:
  - ../integrations/email.md
  - ../commerce/README.md
  - ../admin/README.md
---

# Agent onboarding

## TL;DR

**Rebuilt 2026-10-28: paying for Basic is how you become an agent.** A
signed-in user fills the application at `/dashboard/settings/join-us`
(license number + state, brokerage, MLS association **with the association's
contact details**), then pays for Basic ($125/mo) in Stripe Checkout — promo
codes accepted (`TOASTY13125` = first month free, once per new customer). The
Stripe webhook's plan handler calls `activatePaidAgent()`
(`src/lib/agent-onboarding.ts`): `realEstateAgent` role, subdomain, setup
wizard forced, welcome email to them, "new paid agent" email to the admin. The
agent then **verifies their ID** (Stripe Identity: photo ID + live selfie) from
the dashboard card. Their **public site stays offline** until the admin clicks
**Confirm & publish site** at `/admin/applications/agents`
(`agentApplication.siteApprovedAt`); **Reject & refund** cancels the plan,
refunds the payment and removes the role.

The 9 agents who existed on 2026-10-28 are **grandfathered**
(`agentProfile.grandfathered`, set by `scripts/grandfather-existing-agents.js`):
Basic-level access free forever, old site-live rule. Admins are exempt
everywhere.

## Phase machine (as used)

```
(apply) → awaiting_payment ──pay──▶ site_review ──admin confirm──▶ final_approved
                     │                    └──admin reject (cancel+refund)──▶ final_rejected
                     └──admin reject──▶ final_rejected
```

`inquiry_pending` (old manual-approval flow) and the `verification_*` /
`inquiry_approved` values remain in the enum for old records only.

## Gotchas

- **Stripe Identity must be enabled on the live account.** Until an account
  admin completes the Identity application at
  https://dashboard.stripe.com/identity/application, live sessions fail with
  `identity_api_invalid_application`; `startIdentityVerification()` turns that
  into "ID verification opens soon" and the agent can retry later. Test mode
  works. Results arrive on the MAIN webhook (`identity.verification_session.*`
  events, routed before the plan handlers) and are re-synced when the agent
  returns (`GET /api/agent/verify-identity`). The old
  `/api/webhooks/stripe-identity` route is still unused (its prod secret is a
  test-mode value).
- **Payment grants the role, not the admin.** `/api/stripe/checkout` accepts
  applicants in `awaiting_payment`; approving no longer exists — the admin
  confirms the SITE. A $0 first month (promo) still completes checkout and
  activates the agent; Stripe keeps the card for month two.
- **Sender env override.** Platform mail defaults to
  `ChatRealty <noreply@chatrealty.io>`, but `EMAIL_FROM_DOMAIN` overrides the
  default — a stale Vercel value of `jpsrealtor.com` silently wins over code.
- **Dead phase emails removed.** `email-agent-application.ts` once carried
  `phase1_approved` / `phase1_rejected` / `final_approved` / `final_rejected`
  cases that no caller ever invoked; removed 2026-07-23. The file now exports
  exactly what the live flow uses.
- **Dropped fields, no migration.** Resume, cover letter, whyJoin,
  references, yearsExperience, and brokerageAddress are no longer collected,
  but stay in the Mongoose schema for legacy applications. The TS interface
  marks them optional. `/api/agent/apply` ignores them if an old client sends
  them.
- **One application per user.** A set `phase` makes re-submission 400; the
  form maps that error to the "under review" state instead of showing it.
- **`preferredTeam` plumbing** is still accepted/validated server-side but
  the form never sends it.
- **Admin recipient** comes from `ADMIN_EMAIL` env (fallback
  `josephsardella@gmail.com`). Applicant emails set `replyTo` to that inbox
  so "just reply to this email" actually reaches a human.
- **Approve recomputes the subdomain.** The admin route calls
  `generateSubdomain()` unconditionally, which derives the slug from the
  user's *current* name. A user who already had a subdomain keeps it only if
  it matches; if their name changed, or the subdomain was set another way, it
  is replaced (and the old URL stops resolving to them). Its success message
  still says the site is "active after subscription";
  in fact it goes live when the go-live checklist is done
  (`../commerce/free-tier-gating.md`).
- **The admin Overview's "Pending Applications" card never counts these** —
  it queries phase `"pending"` instead of `inquiry_pending`.
- **Promoting from Admin → Users skips this flow.** Adding the
  `realEstateAgent` role there mints a subdomain (User pre-save hook) but sets
  no `agentApplication` phase and sends no email.

## Files

| Piece | File |
|---|---|
| Signup form (product copy) | `src/app/dashboard/settings/join-us/page.tsx` |
| Entry link ("Get your agent account") | `src/app/dashboard/settings/page.tsx` (Join Our Network section) |
| Submit API | `src/app/api/agent/apply/route.ts` |
| Admin review UI (approve/reject + reason modal) | `src/app/admin/applications/agents/page.tsx` |
| Admin API (role grant, subdomain, emails) | `src/app/api/admin/applications/agents/route.ts` |
| Received + admin-notify + rejection emails | `src/lib/email-agent-application.ts` |
| Approval email (`sendAgentApprovalEmail`) | `src/lib/email-resend.ts` |
| Branded email wrapper | `src/lib/email-brand.ts` |
| Schema (`agentApplication` subdoc) | `src/models/User.ts` |
| Subdomain generation + Vercel registration | `src/lib/generate-subdomain.ts` |
| Silent role refresh (no re-login) | `src/lib/auth.ts` (jwt callback) |
| PARKED identity verification | `src/app/api/agent/verify-identity/route.ts`, `src/app/api/webhooks/stripe-identity/route.ts`, `src/lib/stripe-identity.ts` |

## Email inventory (this flow)

All from the platform sender `ChatRealty <noreply@${EMAIL_FROM_DOMAIN || chatrealty.io}>`,
rendered through `renderBrandedEmail()`.

| Trigger | To | Subject |
|---|---|---|
| Submission | `ADMIN_EMAIL` | New agent signup — {name} |
| Submission | applicant | We got your application — ChatRealty |
| Admin approve | applicant | Welcome to ChatRealty — your agent account is approved |
| Admin reject | applicant | An update on your ChatRealty application (includes the admin's reason verbatim) |

Approval CTA goes to `/agent/settings?onboarding=true` (middleware forces the
same route for un-onboarded agents, so the link is always correct).
