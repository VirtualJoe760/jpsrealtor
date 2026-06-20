---
title: Per-agent Email (Resend) + credit billing
status: current
last_verified: 2026-06-20
related:
  - twilio.md
  - ../commerce/stripe-billing.md
---

# Per-agent Email (Resend)

## TL;DR

Email was single-tenant (everything from shared `noreply@jpsrealtor.com`). It's now
**per-agent**: each agent verifies a **sending domain** under the platform's Resend
account (platform-managed), pays a **flat credit setup fee** to activate, and each
outbound CRM email is **metered in credits**. The **primary/platform agent**
(`PRIMARY_AGENT_EMAIL`) uses the shared sender and is exempt from gating + metering.

## Flow

Settings → **Email** (`EmailSetup`) → enter sending domain + from address →
**Activate email** (bills `EMAIL_SETUP_CREDITS`) → we `resend.domains.create()` and
show the **DNS records** (SPF/DKIM/DMARC) → agent adds them → **Check verification**
(`resend.domains.verify()`) → `emailConfig.status = 'verified'` → sending unlocks.

## Pieces

| Concern | File |
|---|---|
| Model | `User.emailConfig { domain, fromAddress, resendDomainId, status, provisionedAt }` |
| Resend provisioning | `src/lib/email-provision.ts` (create/get/verify/remove domain) |
| API | `GET/POST/PATCH /api/agent/email` (status / provision+bill / verify) |
| UI | `src/app/components/messaging/EmailSetup.tsx` (Settings → Integrations) |
| Send (gated + metered) | `src/app/api/crm/send-email/route.ts` — sends `from` the verified address, `replyTo` the agent's inbox; 403 if not verified, 402 if low credits, debits `email_send` |

## Billing (shared with messaging — see credits config)

| Charge | Constant | Default |
|---|---|---|
| Activate email (flat) | `EMAIL_SETUP_CREDITS` | 100 (~$10) |
| Per email (metered) | `EMAIL_SEND_CREDITS` | 0.02 (~$0.002) |
| Activate messaging (flat) | `MESSAGING_SETUP_CREDITS` | 250 (~$25) |
| Per SMS segment (metered) | `SMS_SEND_CREDITS` | 0.10 (~$0.01) |

Ledger types: `messaging_setup`, `email_setup`, `sms_send`, `email_send` (+ channels
`sms`, `email`). Balances are fractional-safe. Setup fees are **billed before**
provisioning and **refunded** (`type: 'refund'`) if the vendor call fails.

## Gotchas

- **Primary agent is exempt** everywhere (shared sender/number) — don't lock Joseph out.
- **Resend `from` must be a verified domain** — sending from an agent's login Gmail
  fails; that's why per-agent domains exist. `replyTo` carries the agent's real inbox.
- **UNVERIFIED live**: the Resend domain API + the Twilio provisioning both hit live
  vendor accounts ($) and aren't end-to-end tested.
- Transactional platform emails (verification, lead-welcome) still send from the
  platform domain via `email-resend.ts` — only the agent's CRM sends are per-agent.
