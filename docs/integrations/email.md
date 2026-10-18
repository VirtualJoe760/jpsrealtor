---
title: Email (Resend) — platform mail + per-agent CRM sending
status: current
last_verified: 2026-10-17
related:
  - twilio.md
  - ../crm/README.md
  - ../commerce/stripe-billing.md
  - ../agent-onboarding/README.md
---

# Email (Resend)

## TL;DR

Two separate things share Resend. **Platform mail** (verification, 2FA, password
reset, approvals, subscriptions, co-marketing approvals) is sent by
`src/lib/email-resend.ts` and `src/lib/email-agent-application.ts` from
`noreply@<EMAIL_FROM_DOMAIN>` (default `chatrealty.io`). **Per-agent CRM mail** is
sent by `POST /api/crm/send-email`: each paid agent verifies their own sending
domain in the platform's Resend account, pays a flat credit fee to activate, and
each send is metered per recipient. The primary agent (`PRIMARY_AGENT_EMAIL`) uses
the shared sender and is neither gated nor metered. **The CRM composer in the UI
does not currently call that route** (see Gotchas), so per-agent sending has no
working screen for non-admin agents today.

## Gotchas

- **The live composer is the admin one.** `/agent/email` renders `EmailInbox`,
  which imports `ComposePanel.tsx` and posts to `/api/resend/send`; the inbox reads
  `/api/resend/inbox` and `/api/resend/email/[id]`. All of `/api/resend/*` is in
  `ADMIN_API_PREFIXES` (`src/proxy.ts`), so a non-admin agent with a verified domain
  passes the page gate (`canEmail`) and then gets 403 from every call. The
  `/api/crm/send-email` endpoint is only referenced by
  `compose-panel/constants/index.ts`, used by `ComposePanelRefactored`, which is
  imported only by `EmailInboxRefactored`, which nothing imports.
  `/api/resend/*` uses the platform's own mailbox, so do not point agents at it.
- **Activation can be billed twice.** `POST /api/agent/email` rejects only when
  status is already `verified`; calling it again while `provisioning` debits
  another `EMAIL_SETUP_CREDITS`, creates another Resend domain and overwrites
  `resendDomainId`. There is no disconnect route (the "Disconnect first" message
  has nothing behind it, and `removeResendDomain` / `getResendDomain` in
  `email-provision.ts` have no callers).
- **No consent or unsubscribe checks on send.** The route does not look at
  `Contact.doNotContact` or `preferences.emailOptIn`, and the footer promises that
  replying "UNSUBSCRIBE" unsubscribes the recipient, which nothing processes.
- **Debit happens after the send** and a failed debit is only logged
  (`crm/send-email/route.ts:175-183`).
- **Attachments**: files map to `{ filename, content: Buffer }`; the 40 MB limit is
  Resend's, the route does not pre-check size.
- **A deployed `EMAIL_FROM_DOMAIN` overrides the code default.** If Vercel still has
  `jpsrealtor.com`, that wins; remove or update it to send from chatrealty.io.
- **Resend `from` must be a verified domain**; sending from an agent's login Gmail
  fails, which is why per-agent domains exist. `replyTo` carries the agent's inbox.
- **Primary agent exempt everywhere**; do not lock the owner out.
- **Unverified live**: the Resend domain API calls hit a real vendor account and
  have not been tested end to end.

## Per-agent flow

Settings, Integrations, `EmailSetup` (`src/app/components/messaging/EmailSetup.tsx`):
enter a sending domain and from address, **Activate email** (paid plan only,
bills `EMAIL_SETUP_CREDITS`, refunded if provisioning fails), the app calls
`resend.domains.create()` and shows the SPF/DKIM/DMARC records, the agent adds them
and clicks **Check verification** (`PATCH`, `resend.domains.verify()`), and
`emailConfig.status` becomes `verified`.

| Concern | File |
|---|---|
| Model | `User.emailConfig { domain, fromAddress, resendDomainId, status, provisionedAt }` |
| Resend calls | `src/lib/email-provision.ts` |
| API | `src/app/api/agent/email/route.ts`: GET status (`canEmail`, `usingSharedSender`), POST provision and bill, PATCH verify |
| Send | `src/app/api/crm/send-email/route.ts` |
| Page gate | `src/app/agent/email/page.tsx` (checks `canEmail`) |

### `POST /api/crm/send-email`

Order of checks: session (401), free tier (403 "Email sending requires a paid
plan", admins exempt), input validation, then for non-primary agents: verified
domain (403 `email_not_setup`) and balance (402 `insufficient_credits`). Accepts
`application/json` (`to, subject, message, contactName?, cc?, bcc?`, plain text,
newlines become `<br>`) or `multipart/form-data` (same fields, `message` is rich
HTML, repeated `attachments` parts). Lists are comma-split and each address is
checked against a simple regex. Cost is `EMAIL_SEND_CREDITS` times the count of
to, cc and bcc recipients. The sender is the agent's `emailConfig.fromAddress`
(primary: `noreply@<EMAIL_FROM_DOMAIN>`), display name is the agent's name, and the
body goes into the route's own HTML shell (not `renderBrandedEmail`).

## Billing (constants in `src/config/credits.ts`)

| Charge | Constant | Value |
|---|---|---|
| Activate email (flat) | `EMAIL_SETUP_CREDITS` | 100 (about $10) |
| Per recipient (metered) | `EMAIL_SEND_CREDITS` | 0.02 (about $0.002) |
| Activate messaging (flat) | `MESSAGING_SETUP_CREDITS` | 250 (about $25) |
| Per SMS segment (metered) | `SMS_SEND_CREDITS` | 0.10 (about $0.01) |

Ledger types `email_setup`, `email_send`, `messaging_setup`, `sms_send`; channels
`email` and `sms`. The ledger is `CreditLedger` via `src/lib/credits.ts`;
`PointsLedger` and `config/credit-costs.ts` are back-compat shims over the same
collection.

## Platform mail

- `email-resend.ts` has 13 senders. Four use the agent-branded from-line
  `"{agent.name} via ChatRealty <noreply@...>"` (verification, 2FA, password reset,
  lead welcome); the other nine use `platformFrom()`. It builds the Resend client
  lazily (`getResendClient()`); `crm/send-email` creates its own client at module load.
- `src/lib/email-brand.ts` exports `renderBrandedEmail()` (dependency-free,
  table-based shell: logo header, `#2563eb` CTA, reply-to-us footer), `platformFrom()`
  and `escapeHtml()`. Only one of the 13 `email-resend.ts` senders
  (`sendAgentApprovalEmail`) uses the shell; the three agent-application mails in
  `src/lib/email-agent-application.ts` do too. `email-resend.ts` also keeps its own
  private `platformFrom()`, a duplicate of the one in `email-brand.ts`.
- `EMAIL_FROM_DOMAIN` (default `chatrealty.io`) is read in `email-resend.ts`,
  `email-brand.ts`, `crm/send-email/route.ts`, `campaign/submit/route.ts` and the
  newsletter send route (`newsletter@<domain>` unless `EMAIL_FROM` is set).
  End-user sign-in mail for tenant sites uses `END_USER_EMAIL_DOMAIN` (default
  `chatrealty.io`, `src/lib/crm/end-user-auth.ts`). A sweep on 2026-07-28 removed
  the last jpsrealtor.com senders (commit `912fa84a`; `src/lib/email.ts` is gone).
- Not on Resend: `/api/contact`, `leads/buy-intake` and `leads/sell-intake` send
  through nodemailer with Gmail credentials (`EMAIL_USER`, `EMAIL_PASS`);
  `/api/resend/send` is the admin's personal composer.
