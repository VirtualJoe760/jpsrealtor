---
title: SMS Compliance — A2P 10DLC + per-agent TOS/Privacy
status: current
last_verified: 2026-10-17
related:
  - twilio.md
  - ../crm/README.md
  - ../multi-tenant/README.md
---

# SMS Compliance (A2P 10DLC + per-agent legal)

## TL;DR

To text US consumers at scale, the platform acts as an **ISV** on its one Twilio
account and each agent needs their own A2P 10DLC **Brand + Campaign**. Carriers
want SMS-specific Terms and Privacy language, published on the agent's own site,
as opt-in evidence. The clause generators and the per-agent legal pages are
**built and live**: the clauses are always appended to every agent's Terms and
Privacy page. What is **not** built is the registration itself: the business info
is collected and stored, but nothing submits a Brand or Campaign to Twilio, and
nothing sets the status to `approved`. The clauses are a reviewable draft, not
legal advice; have counsel review them.

## Pieces

| Piece | File |
|---|---|
| SMS Terms and Privacy clause generators (`smsTermsClause`, `smsPrivacyClause`, `smsLegalSections`) | `src/lib/messaging/sms-legal.ts` |
| Per-agent Terms/Privacy composer; always appends the SMS clauses and a mandatory platform clause, even over an agent's custom body | `src/lib/legal/agent-legal.ts` (`composeAgentTerms`, `composeAgentPrivacy`) |
| Agent legal API (GET, PATCH; custom bodies in `User.legal.customTerms/customPrivacy`) | `src/app/api/agent/legal/route.ts` |
| Editor | `src/app/components/legal/LegalSettings.tsx` (Settings, Integrations) |
| Public pages: platform master on the primary host, generated per-agent doc on a branded domain via `resolveDomainOwner` | `src/app/terms-of-service/page.tsx`, `src/app/privacy-policy/page.tsx`, `src/app/components/legal/AgentLegalDoc.tsx` |
| Cache rule: `no-store` for these two paths (they differ per domain) | `vercel.json` |
| Business-info form and API (`legalBusinessName`, `ein`, `businessType`, `supportEmail`, optional website, phone, address) | `src/app/components/messaging/A2PRegistration.tsx`, `src/app/api/agent/messaging/a2p/route.ts` |
| Runtime STOP / START / HELP handling | `src/app/api/crm/sms/webhook/route.ts` |

## The required disclosures (CTIA / A2P)

| # | Disclosure | Produced by |
|---|---|---|
| 1 | Program description | `smsTermsClause` ("Program") |
| 2 | Opt-in consent, not a condition of purchase | `smsTermsClause` ("Consent") |
| 3 | Message frequency varies | `smsTermsClause` |
| 4 | Message and data rates may apply | `smsTermsClause` |
| 5 | STOP to opt out, HELP for help (START to opt back in) | `smsTermsClause`, handled in the webhook |
| 6 | "No mobile information will be shared with third parties or affiliates for marketing" | `smsPrivacyClause` (carriers reject campaigns without it) |

## Registration flow

1. Agent buys a number: Settings, Integrations, Text messaging (`MessagingSetup`).
   Built, never run live.
2. Agent fills in business info (`A2PRegistration`); the API stores it under
   `User.messaging.a2p` and sets `a2p.status = 'pending'`. Built.
3. Someone submits the Brand and Campaign to Twilio, linking the agent's published
   Terms/Privacy URL and sample messages as opt-in evidence. **Not built.**
4. On approval, `a2p.brandSid`, `campaignSid` and `status = 'approved'` get set.
   **No code does this**; today it would be a manual database edit.

## Gotchas

- **Nothing reads `a2p.status` before sending.** The send route gates on
  `messaging.status === 'active'` (set at provisioning), so an agent whose A2P is
  `none` or `pending` can send and carriers may filter it. See `twilio.md`.
- **Item 6 is the usual rejection reason.** Keep the sentence in the privacy clause.
- **Opt-in evidence is more than published text.** The campaign submission also
  needs a description or screenshot of the consent mechanism. The platform's own
  buy/sell lead forms record `marketingConsent` and `emailOptIn` but not
  `smsOptIn` or `tcpaConsent` (`src/app/api/leads/buy-intake/route.ts`), and the
  send route does not require SMS consent, only that the contact is not
  `doNotContact`. Capturing SMS consent at the form is open work.
- **The primary host does not use the generated clauses.** On the platform's own
  domains the pages are the hand-written `PlatformTerms.tsx` / `PlatformPrivacy.tsx`.
  They mention SMS only in passing (carrier rates, "reply STOP to marketing SMS");
  they have no program description, frequency statement, HELP line, or the item 6
  "no sharing of mobile information" sentence. The shared `TWILIO_PHONE_NUMBER`
  that the primary agent texts from is covered by those pages, not by the
  generated ones.
- **The clauses are boilerplate.** Review with counsel before relying on them.
- **The EIN is stored in plaintext** on the user document (`User.messaging.a2p.ein`).
- **Nothing delivers reliably until the campaign is approved.**

## Open decisions

- Brand model: per-agent Secondary Brand (most compliant, more vetting) versus a
  shared brand with per-agent campaigns (faster). Locked so far: per-agent Brand and
  Campaign.
- Who runs the ISV submission, and whether to block sending until `approved`.
