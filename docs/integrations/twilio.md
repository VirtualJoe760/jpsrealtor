---
title: Twilio SMS — per-agent messaging
status: current
last_verified: 2026-10-17
supersedes: archive/integrations/TWILIO.md
related:
  - sms-compliance.md
  - email.md
  - ../crm/README.md
  - ../campaigns/README.md
  - ../commerce/stripe-billing.md
  - ../content-templates/auto-posting.md
---

# Twilio SMS — per-agent messaging

## TL;DR

SMS is **multi-tenant in code, unproven live**. The platform owns one Twilio
account (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`); each paid agent buys their own
number through Settings, gets a Twilio Messaging Service, and pays in credits
(a flat activation fee plus a per-segment charge). The **primary agent**
(`PRIMARY_AGENT_EMAIL`, falls back to the owner's address) keeps using the shared
`TWILIO_PHONE_NUMBER` and is neither gated nor metered. US consumer delivery still
depends on each agent's A2P 10DLC registration, and **nothing in the code submits
that registration to Twilio** (the business info is collected and stored only).
The same Twilio account also sends 2FA codes and lead alerts from the platform
number.

## Gotchas

- **`status: 'active'` does not mean A2P-approved.** Provisioning sets
  `messaging.status = 'active'` and `a2p.status = 'none'`. The send route checks
  only `active`, never `a2p.status`, so a non-approved agent can send and carriers
  may filter it.
- **Send enforces `doNotContact`, not consent.** `preferences.smsOptIn` and
  `consent.tcpaConsent` are stored but never required to send.
- **Inbound routing is by the `To` number.** An unknown `To` returns an empty
  200. The shared env number and `TWILIO_ALERT_NUMBER` both resolve to the primary
  agent.
- **Replies to the alert number always land on the primary agent.** Post
  approvals ("POST A4") work only when the replying phone is the *primary* agent's
  own phone. Any other agent's reply is treated as a normal inbound message to the
  primary agent's CRM (today it is lost, because of the enum bug below).
- **Inbound from an unknown number loses the message.** The webhook auto-creates a
  Contact with `source: 'inbound_sms'`, `status: 'lead'`, neither of which is in the
  Contact enums, so the create throws, the catch answers an empty 200 and nothing is
  stored. Details in `../crm/README.md`.
- **Delivery receipts probably never arrive.** `POST /api/crm/sms/send` passes no
  `statusCallback`, the Messaging Service is created with only an inbound URL, and
  the number-level `statusCallback` set at provisioning is Twilio's voice hook. The
  status webhook only fires if a status URL is configured in the Twilio Console.
- **`/api/crm/sms/sync` is a single-tenant leftover.** It reads message history for
  the platform env number only (`getMessageHistory`), not the caller's number.
- **Debit happens after the send** and its failure is only logged
  (`crm/sms/send/route.ts:161-169`), so a failed debit means a free text.
- **Webhook URLs are rebuilt from `x-forwarded-*`** before signature validation;
  the https URL must match the one in the Twilio Console exactly.
- **Live updates need `server.js`** (socket.io); see `../crm/README.md`.
- **Never hard-code an agent name or number in a template**; pull it from the agent.

## Pieces

| Piece | File | Behaviour |
|---|---|---|
| Client | `src/lib/twilio.ts` | Module-level client (not lazy). `sendSMS` uses `messagingServiceSid` if given, else `from`, else `TWILIO_PHONE_NUMBER`. Also number search/purchase, Messaging Service creation, 2FA SMS. `validatePhoneNumber` (Lookup, $0.005) and `sendBulkSMS` have no callers |
| Send | `src/app/api/crm/sms/send/route.ts` | Session; admins bypass, free tier gets 403; `doNotContact` gets 403; non-primary needs `messaging.status === 'active'` (403 `messaging_not_setup`) and balance (402 `insufficient_credits`); sends from the agent's Messaging Service/number; saves `SMSMessage`; debits `sms_send`; emits a socket event |
| Inbound | `src/app/api/crm/sms/webhook/route.ts` | Verifies `X-Twilio-Signature` (403 on failure), resolves the agent, handles post approval, find-or-creates the Contact (`phone` or `phones.number`), handles STOP / START / HELP, optional AI reply, dedups on `MessageSid`, saves, emits socket and push notification, answers TwiML |
| Status | `src/app/api/crm/sms/status-webhook/route.ts` | Signature-verified; updates `SMSMessage.status` by SID and emits a status event |
| History | `crm/sms/{conversations,messages,sync}/route.ts` | Per-`userId` reads; `sync` imports Twilio history |
| Number search | `src/app/api/agent/messaging/numbers/route.ts` | Session only; needs `areaCode` or `contains`; max 30 results |
| Provision | `src/app/api/agent/messaging/provision/route.ts` | Paid plan only; debits `MESSAGING_SETUP_CREDITS` first, buys the number, creates the Messaging Service, stores `messaging.*`; refunds on failure; 409 if a number exists (no disconnect route exists) |
| Status and toggles | `src/app/api/agent/messaging/route.ts` | GET status (`canMessage`, `usingSharedNumber`), PATCH `leadAlertsSms` / `aiInbound` |
| A2P info | `src/app/api/agent/messaging/a2p/route.ts` | GET/POST; requires legal name, EIN, business type, support email; sets `a2p.status = 'pending'`; 409 once approved |
| UI | `src/app/components/messaging/{MessagingSetup,A2PRegistration}.tsx` | Settings, Integrations |
| Messages page | `src/app/agent/messages/` | Conversation UI over the routes above |
| Model | `User.messaging` (`src/models/User.ts`) | `twilioNumber`, `twilioNumberSid`, `messagingServiceSid`, `a2p{brandSid, campaignSid, status, business info}`, `status`, `provisionedAt`, `leadAlertsSms` (default true), `aiInbound` (default false). `ein` is stored in plaintext |

## Keywords and automations

- **STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT** set `doNotContact = true`
  and `preferences.smsOptIn = false`; **START / YES / UNSTOP** reverse it;
  **HELP / INFO** replies with the agent name and opt-out text.
- **Inbound AI** (`src/lib/messaging/inbound-ai.ts`): off by default
  (`messaging.aiInbound`), skipped for `doNotContact` contacts. Intent-match only:
  an open-house phrase or a homes-for-sale phrase; anything else returns nothing so
  the agent handles it. With an intent but no city (from the text or the contact's
  address or interests) it asks which city. Otherwise it queries the platform
  `UnifiedListing` collection for active listings in that city (open houses, or the
  five cheapest for-sale), replies with up to 4 results plus listing links. Replies
  are not saved into the thread.
- **Lead alerts** (`src/lib/messaging/notify-agent.ts`, `notifyAgentLead`): texts
  the agent's cell (`agentProfile.cellPhone`, `officePhone`, or `User.phone`) from
  the **platform env number**, best effort. Fired by `leads/buy-intake`,
  `leads/sell-intake` and `appointments/book` (`hot_lead`). It is neither
  free-tier gated nor metered, and opt-out is `messaging.leadAlertsSms`.
- **Post alerts and approval** (`notify-agent-posts.ts`, `post-approval-sms.ts`):
  the "posts ready", "slot due" and "posted" senders would use
  `TWILIO_ALERT_NUMBER` (falling back to the shared number when unset) and honour
  the same `leadAlertsSms` switch, but **none of the three has a caller yet**, so
  no post alert is ever sent. `POST` or `POST <code>` from the agent's own phone
  approves a `PendingPost` in `awaiting_review` and runs before the contact lookup
  so it never creates an "Unknown Contact". `YES` is deliberately not an approval
  word because it is the A2P opt-in keyword. See `../content-templates/auto-posting.md`.

## Billing

Constants live in `src/config/credits.ts`: `MESSAGING_SETUP_CREDITS` (250, about
$25) and `SMS_SEND_CREDITS` (0.10 per segment, about $0.01). `estimateSmsCredits`
counts segments. Ledger types `messaging_setup` and `sms_send`, channel `sms`.
Setup is billed before the vendor call and refunded (`type: 'refund'`) if it fails.

## Unverified and open

- Number purchase, Messaging Service creation and the whole provisioning path hit
  the live Twilio account and have never been exercised end to end.
- The ISV Brand/Campaign submission to Twilio is not built; an operator would have
  to do it and then set `a2p.brandSid`, `campaignSid` and `status = 'approved'`.
- Mark-as-read is missing: the conversation `unreadCount` is every inbound message.
- Decisions on record: one Twilio account with a Messaging Service per agent (no
  subaccounts), a Brand plus Campaign per agent, billing through credits.
