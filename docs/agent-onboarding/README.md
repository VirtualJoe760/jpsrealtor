---
title: Agent Onboarding (product signup → manual approval)
status: current
last_verified: 2026-07-23
related:
  - ../integrations/email.md
  - ../commerce/README.md
---

# Agent onboarding

## TL;DR

Agents are **customers** buying into the ChatRealty framework, not recruits
joining a team (pivoted 2026-07-23 away from the old "Join Our Team"
resume/references flow). A signed-in user fills a one-minute license form
(license number + state, MLS association, optional MLS agent ID, brokerage
name), which sets `User.agentApplication.phase = "inquiry_pending"`. An admin
**manually** approves or rejects at `/admin/applications/agents`. Approval
grants the `realEstateAgent` role, reserves a subdomain, and emails the agent
a setup CTA. The silent JWT permission refresh in `src/lib/auth.ts` (60s
throttle) picks up the new role — **no re-login needed** after approval.

## Phase machine (as used)

```
(submit) → inquiry_pending → final_approved   (admin approve: role + subdomain + welcome email)
                           → final_rejected   (admin reject: reason stored + rejection email)
```

The `agentApplication.phase` enum still contains `inquiry_approved`,
`verification_*`, etc. — those belong to the **parked** Stripe Identity flow
and are never set by live code.

## Gotchas

- **Parked Stripe Identity.** `src/app/api/agent/verify-identity/route.ts`,
  `src/app/api/webhooks/stripe-identity/route.ts`, and
  `src/lib/stripe-identity.ts` are unreachable by design: verify-identity
  requires phase `inquiry_approved`, which nothing ever sets. Kept
  deliberately (marked `PARKED (2026-07-23)` in their headers) for possible
  future ID-verification. Don't delete; don't wire up without a decision.
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
| Subdomain generation | `src/lib/generate-subdomain.ts` |
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
