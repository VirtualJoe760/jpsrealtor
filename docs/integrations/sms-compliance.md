---
title: SMS Compliance — A2P 10DLC + per-agent TOS/Privacy
status: partial
last_verified: 2026-06-11
related:
  - twilio.md
---

# SMS Compliance (A2P 10DLC + per-agent legal)

## TL;DR

To send SMS to US consumers at scale, the platform registers as an **ISV** with
Twilio and each **agent** gets their own **A2P 10DLC Brand + Campaign**. Carrier
vetting requires each agent's site to publish **SMS-specific Terms + Privacy**
language (consent, frequency, rates, STOP/HELP, and the "no mobile info shared
for marketing" clause), linked on the campaign as **opt-in evidence**. Draft
clause generators live in `src/lib/messaging/sms-legal.ts`. **This is a
reviewable draft, not legal advice — have counsel review before publishing.**

## The required disclosures (CTIA / A2P)

| # | Disclosure | Where |
|---|---|---|
| 1 | Program description (what texts, from whom) | Terms |
| 2 | Consent is opt-in & not a condition of purchase | Terms + the opt-in form |
| 3 | "Message frequency varies" | Terms |
| 4 | "Message & data rates may apply" | Terms |
| 5 | Opt-out: reply **STOP**; help: reply **HELP** | Terms + handled in webhook |
| 6 | **"No mobile information will be shared with third parties/affiliates for marketing."** | Privacy (carriers now reject campaigns without this) |

Items 1–6 are produced per-agent by `smsTermsClause()` / `smsPrivacyClause()`.
The STOP/HELP/START runtime handling already lives in the inbound webhook
(`/api/crm/sms/webhook`).

## Per-agent registration flow (Phase 2, external)

1. Agent provisions a number (done — Settings → Integrations → Text messaging).
2. Collect the agent's business info (legal name, EIN, address, website) in
   onboarding → stored under `User.messaging.a2p`.
3. Register the agent's **Brand** + **Campaign** via Twilio (ISV/secondary brand).
   The campaign references the agent's published SMS Terms/Privacy URL (the
   generated clauses) as opt-in evidence and the sample messages.
4. On approval, set `User.messaging.a2p.status = 'approved'`. Until then,
   consumer SMS may be filtered.

## Where the clauses should be published

Each agent's site already renders per-domain content. The SMS sections should be
appended to that agent's **Terms** and **Privacy** pages (rendered from
`smsTermsClause` / `smsPrivacyClause` with the agent's `name` / contact info), so
each agent presents the disclosures under their own brand — which is exactly what
the per-agent A2P campaign points to.

## Gotchas

- **The clauses are a DRAFT.** `sms-legal.ts` is standard boilerplate; review with
  the agent/counsel before going live.
- **Item 6 is the common rejection reason** — the "no sharing of mobile info for
  marketing" sentence must be present verbatim-ish in Privacy.
- **Opt-in evidence** (a screenshot/description of the consent checkbox + the
  Terms link) is part of the campaign submission, not just the published text.
- **Nothing delivers reliably until the campaign is approved** — A2P is the gate.

## Open decisions for the user

- Brand model: per-agent **Secondary Brand** (most compliant, more vetting) vs a
  shared brand with per-agent campaigns (faster). Locked decision so far:
  per-agent Brand + Campaign.
- Whether to auto-append the SMS sections to existing Terms/Privacy pages now, or
  gate them behind provisioning.
