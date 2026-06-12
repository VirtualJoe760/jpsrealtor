---
title: Twilio SMS — Multi-Tenant Agency (current state + gameplan)
status: partial
last_verified: 2026-06-11
supersedes: docs/archive/integrations/TWILIO.md
related:
  - ../campaigns/README.md
  - ../commerce/stripe-billing.md
---

# Twilio SMS — Multi-Tenant Agency

## TL;DR

SMS works **single-tenant** today: one shared number (`TWILIO_PHONE_NUMBER`
`+17602620014`), one account in env, with a clean per-`userId` DB layer
(`sms-message.userId`, `Contact.userId`). The goal is a **multi-tenant agency**
where **each agent registers their own Twilio identity** (their own number +
A2P 10DLC brand/campaign), billed via credits, with the platform as the **ISV**
facilitator. The Messages UI (`/agent/messages`, WhatsApp-style) had ~real bugs;
the high-impact ones are fixed (Phase 0). The archived doc claimed "production
ready" — it isn't, for multi-tenant.

## The hard gate: A2P 10DLC

US carriers **require** A2P 10DLC registration (Brand + Campaign) to send SMS to
consumers — without it, agent texts get filtered/blocked. Multi-tenant ⇒ the
platform onboards as an **ISV** and registers a **Brand + Campaign per agent**
(their legal/EIN + use-case + opt-in evidence). Fees + multi-day vetting ⇒ this
is the **long pole that gates live sending** (parallels the Google dev-token gate
for ads). Each agent's **per-agent TOS + Privacy** are the consent evidence the
campaign registration links to.

## Current implementation (single-tenant)

| Piece | File | Note |
|---|---|---|
| Twilio client | `src/lib/twilio.ts` | always sends from the one env number |
| Send | `/api/crm/sms/send` | per-`userId` ✅ |
| Inbound webhook | `/api/crm/sms/webhook` | routes by contact phone; **falls back to "first user"** ❌ |
| Status webhook | `/api/crm/sms/status-webhook` | delivery updates |
| History / threads / sync | `/api/crm/sms/{messages,conversations,sync}` | per-`userId` ✅ |
| Models | `sms-message.ts`, `Contact.ts` | no Twilio fields on `User` |
| UI | `src/app/agent/messages/page.tsx` + `components/crm/messages/*` + `agent/messages/{hooks,utils}` | WebSocket (not polling) |

## Bugs

**Fixed (Phase 0, 2026-06-11):**
- **Compose was 100% broken, silently** — sent `message:` (API wants `body:`) + the
  deprecated `.phone` field + no `res.ok` check. Fixed: correct field, `phones[]`
  support, per-recipient failure reporting.
- **Hardcoded "Joseph Sardella"** in the opt-in template → `optInTemplate(agentName)`.
- **WebSocket listener stacking** — `conversations` in the effect deps re-registered
  handlers on every refresh (duplicate notifications). Now read via a ref.
- **Auto-scroll yanked you to the bottom** on every change → instant on open, smooth
  only on a new message when already near the bottom.

**Fixed (Phase 1, 2026-06-11):**
- **Webhook routing** — was "first user" fallback; now resolves the agent by the `To` number (legacy env number → primary agent).
- **STOP/HELP/START** keyword auto-handling (sets `doNotContact`/opt-in + TwiML reply) — A2P requirement.
- **Send blocks `doNotContact`** contacts (TCPA enforcement on send).

**Provisioning UI** ✅ (2026-06-11): `src/app/components/messaging/MessagingSetup.tsx` in
Settings → Integrations — search by area code → pick → claim (confirms the rental) →
shows the number + A2P status. Calls the (live, unverified) provision route.

**Deferred (later phases):**
- Mark-as-read (unread count = "all inbound forever"; needs a read-state).
- A2P registration flow (Phase 2 — the actual Brand/Campaign submission + per-agent TOS/Privacy).

## Gameplan

| Phase | Scope |
|---|---|
| **0. UI bug fixes** ✅ done | compose, opt-in template, websocket, scroll |
| **1. Multi-tenant plumbing** ✅ done (UNVERIFIED live) | `User.messaging{ twilioNumber, twilioNumberSid, messagingServiceSid, a2p, status }`; number provisioning lib + routes (`/api/agent/messaging`, `/numbers`, `/provision` — search → pick → buy → Messaging Service → store); `sendSMS` sends via the agent's Messaging Service/number; send route blocks `doNotContact`; **webhook resolves the agent by the `To` number** (killed the first-user fallback); **STOP/HELP/START handler** in the webhook. NOTE: provisioning calls live Twilio (buys a real number) — untested. |
| **2. A2P onboarding + per-agent legal** ⏳ in progress | **Per-agent TOS/Privacy GENERATOR built** (`src/lib/legal/agent-legal.ts`) — parameterizes the platform's own approved docs (`src/app/terms-of-service`, `src/app/privacy-policy`) per agent, with a **mandatory non-removable platform clause** (releases ChatRealty/JPS & Company LLC from liability on the agent's branded site) + SMS clauses always appended; agents can supply a custom body (`User.legal.customTerms/customPrivacy`) and our clauses still attach. API: `GET/PATCH /api/agent/legal`. SMS-specific clauses in `src/lib/messaging/sms-legal.ts`; see `sms-compliance.md`. **Public per-agent pages LIVE**: `/terms-of-service` + `/privacy-policy` are now server components that render the platform master for the primary agent and the generated per-agent doc (markdown via `AgentLegalDoc`) on branded domains (via `resolveDomainOwner`); the old hardcoded pages are kept as `PlatformTerms`/`PlatformPrivacy`. **Editor LIVE**: `LegalSettings` in Settings → Integrations. **Cache**: added `vercel.json` no-store for `/(terms-of-service|privacy-policy)` (they're per-domain dynamic — would otherwise be poisoned by the catch-all immutable). **Business-info onboarding LIVE**: `A2PRegistration` form (in MessagingSetup) + `GET/POST /api/agent/messaging/a2p` collect & persist legal name/EIN/business type/address/support contact to `User.messaging.a2p.*` and set `status='pending'` (shows under-review / approved states). Remaining (external only): the actual ISV submission to Twilio that creates the Brand/Campaign and sets `brandSid`/`campaignSid`/`status='approved'`. |
| **3. Lead-alert SMS** ✅ partial | `lib/messaging/notify-agent.ts` (`notifyAgentLead`) texts the agent's cell from the platform number; opt-out via `User.messaging.leadAlertsSms`. Wired into **buy-intake + sell-intake** (`new_lead`) and **appointments/book** (`hot_lead`). FUB sync is agent-initiated/batch → intentionally NOT alerted (a future automatic FUB webhook should call `notifyAgentLead`). The AI `hot_lead`/`client_update` kinds are ready for when the AI detector exists. TODO: settings toggle for `leadAlertsSms`. |
| **4. Inbound AI SMS** ✅ done (UNVERIFIED live) | `lib/messaging/inbound-ai.ts` `handleInboundQuery` — **intent-match only** (open-house / homes-for-sale phrases; returns null otherwise → webhook stays silent, agent handles it). Queries `UnifiedListing.OpenHouses[]` / active listings by city (from the text, or the contact's city), replies via TwiML with up to 4 results + links. **Opt-in** per agent (`User.messaging.aiInbound`, default off — auto-texting clients is sensitive). Webhook calls it after STOP/HELP. **Settings toggles for `leadAlertsSms` + `aiInbound` are live** (MessagingSetup + `PATCH /api/agent/messaging`). Follow-up: save AI replies into the thread. |

## Decisions (locked 2026-06-11)

- **Twilio structure:** one account + **Messaging Service per agent** (not subaccounts) — simpler credit billing.
- **A2P:** ISV with a **Brand + Campaign per agent** (most compliant).
- **Billing:** SMS segments + the ~$1.50/mo number → charged to agents via **credits** (same model as ads / thanks.io / Drop Cowboy).
- **Framing:** the platform *facilitates*; each agent owns their own Twilio compliance/accountability.

## Gotchas

- **Never hard-code an agent name/number** in templates — multi-tenant. Pull from the agent/session.
- **Inbound routing must key off the agent's `To` number**, not "first user."
- **Live sending is A2P-gated** — build everything else, but consumer SMS won't deliver reliably until each agent's campaign is approved.
- `Contact` moved to `phones[]`; `.phone` is legacy — read primary from `phones[]` with a `.phone` fallback.
