---
title: Co-Marketing Group Ad-Spend (RESPA) — Design
status: partial
last_verified: 2026-06-11
related:
  - ./README.md
  - ../archive/chatrealty/SERVICE_PARTNERS.md
  - ./go-live-checklist.md
---

# Co-Marketing Group Ad-Spend (RESPA) — Design

> **Status: design/plan.** Not built. This is the spec for review before code.

## TL;DR

An agent builds content (landing page / blog / ad), and at publish can **bill the
ad spend across one or more pre-established partnerships** (lender, contractor,
co-agent, home-warranty, …). The campaign stages as **pending ad-spend**, every
party is **emailed to approve or deny their fair-value share**, and only once the
required parties approve is each share **collected and the campaign launched** (on
the agent's own ad account, via the multi-tenant launch path). The platform
administers the **documented, fair-value, auditable split** — the thing raw Meta
ads can't do. This is the product moat and the Meta Advanced-Access narrative.

## The flow

```
Agent builds content + ad in dashboard
  └─ at "Publish": choose "Bill to partnership(s)" → pick parties + per-party shares
       └─ Campaign.status = 'pending_adspend'  (NOT live)
       └─ create CampaignFunding { participants[], shares, approvals=pending }
       └─ email each party a tokenized Approve / Deny link (their $ share + the creative)
            ├─ any required party DENIES → funding 'rejected', campaign stays draft, agent notified
            └─ all required parties APPROVE → collect each party's share (party → platform)
                 └─ Campaign funded → launch on the AGENT's ad account (Phase 1 path)
                 └─ nightly settle reconciles credits vs real spend (Gate 4)
```

## What we reuse (already built)

| Piece | File |
|---|---|
| Standing pairwise relationship + JMA + default split terms | `src/models/Partnership.ts` |
| Service-partner profiles (mortgage_broker w/ NMLS, title, contractor, …) | `User.servicePartnerProfile` |
| Apply / directory / admin approval | `/api/service-partner/*`, admin dashboard |
| Ledger split transaction types (`partner_split_credit/debit`, `partnershipId`) | `src/models/CreditLedger.ts` |
| Credit math + debit/credit | `src/lib/credits.ts`, `src/config/credits.ts` |
| Per-agent ad launch on the agent's own account | `launch-ads/route.ts` (Phase 1) |

## Data model changes

### 1. `Partnership` (standing, pairwise) — minor changes
- **Relax participants:** today `servicePartnerId` must be a `serviceProvider`. Allow
  **agent↔agent** co-marketing (two agents / team) — add a `partnerRole`
  ('service_provider' | 'agent') or generalize the ref. Keep RESPA JMA fields
  (they apply to agent↔settlement-provider pairs; agent↔agent is not §8 but still
  fair-value).
- Keep `terms` as the **default** split for this pair; the per-campaign funding can
  override with explicit amounts.
- The unique `{agentId, servicePartnerId}` index stays for pairwise dedupe.

### 2. NEW `CampaignFunding` model (`src/models/CampaignFunding.ts`) — the new core
Per-campaign, N-party funding + approval record:
```
campaignId, agentId (lead), status: 'pending'|'approved'|'rejected'|'funded'|'cancelled',
totalCredits, allocationBasis: 'co_branding_share'|'percentage'|'fixed'|'equal',
participants: [{
  userId, partnershipId, role,
  shareCredits, shareDollars,          // this party's fair-value share
  approval: 'pending'|'approved'|'denied',
  approveToken (HMAC, single-use, TTL), respondedAt, deniedReason,
  funded: boolean, ledgerTxnId,
}],
createdAt, fundedAt
```
- The **lead agent** is a participant too (pays their own share).
- `requiredApprovals` = all participants (deny by any required party blocks).

### 3. `Campaign` — add
- `fundingId?` → CampaignFunding ref.
- New status **`pending_adspend`** (between `approved` and `active`).
- Co-branding: `coBranding: [{ userId, logoUrl, name, role }]` (agent + each partner).

### 4. `AdCampaignRecord` — add `fundingId?` + `contributors: [{ userId, shareCredits }]`
so spend is attributable per party for settlement + reporting.

### 5. `CreditLedger` — reuse `partner_split_debit`; add `fundingId` to the txn extras.

## Fair-value allocation (the RESPA core)

- Each party's share must reflect the **fair market value of the advertising THEY
  receive** — tied to their presence in the creative (co-branding share), never a
  referral payment.
- Allocation bases supported: `equal`, `percentage` (from JMA terms),
  `fixed` (explicit per-party $), or `co_branding_share` (proportional to logo/area
  presence — the most defensible default for §8 pairs).
- The **per-campaign approval email IS the per-campaign consent record**: each party
  sees the exact creative + their exact $ share and approves it. Stored on the
  funding doc → strong audit trail (better than a blanket MSA).
- Enforce `maxMonthlyContribution` caps from the standing partnership.

## Approval + funding execution

- **Tokenized approve/deny links** reuse the `oauth-state.ts` HMAC pattern: a signed,
  single-use, short-TTL token per participant (`{fundingId, userId, purpose}`), so a
  party can act from the email without a session — verify, record, mark used.
  (Logged-in approval in-dashboard also supported.)
- **Collection (party → platform):** on each approval, debit that party's credits for
  their share (`debit({userId, credits, reason:'partner_split_debit', fundingId})`).
  If a party lacks credits → prompt top-up (Stripe) before they can approve-fund.
  Money flows **party → platform**, never partner → agent.
- **Launch on full funding:** when every required participant is funded, set
  `Campaign.status='active'` and run the existing `launch-ads` path (agent's account).
- **Settlement:** the Gate-4 nightly cron reconciles each contributor's reserved
  credits against real Meta/Google spend, pro-rata.
- **Deny / timeout:** any required deny → `rejected`, refund any already-collected
  shares, notify the agent, campaign returns to draft.

## Multi-tenant integration

Co-marketing **sits on top of** the multi-tenant ad work: the funded campaign launches
on the **lead agent's** connected ad account (Phase 1 threading). The split is purely
platform-side credit administration — Meta/Google still see one ad account. **That
separation is the pitch:** "one ad account, multi-party compliant funding."

## Meta Advanced-Access framing

Reframe the submission from "we run ads for agents" → **"ChatRealty administers
RESPA-compliant multi-party co-marketing: agents and licensed settlement-service
partners jointly fund co-branded campaigns with documented, fair-value, per-campaign
approved cost allocation and an auditable ledger. `ads_management` deploys the
co-branded campaign on the lead agent's account; the multi-party billing + compliance
layer is ours."** Screencast shows: build content → bill partnership → parties approve
shares → campaign launches. Strong, and true.

## Legal caveat (must stay honest)

We build the **tooling** that makes compliance *demonstrable* (JMA capture, fair-value
allocation, per-campaign consent, audit ledger). We do **not** assert "RESPA compliant"
as a guarantee. Before marketing it that way or claiming it to Meta, a **real-estate /
RESPA attorney must sign off** on the allocation method, the JMA template, and the
agent↔agent vs agent↔settlement-provider handling.

## Phased build plan

| Phase | Scope |
|---|---|
| **A. Model + relationships** ✅ **DONE** (commit f6562aaa) | `CampaignFunding` model; `Partnership.partnerRole` (agent↔agent); `Campaign.pending_adspend` + `fundingId` + `coBranding`; `AdCampaignRecord.fundingId` + `contributors`; `CreditLedger` txn `fundingId`. |
| **B. Bill-at-publish UI** | "Bill to partnership(s)" picker at content/campaign publish: select parties, allocation basis, preview each share. |
| **C. Approval flow** | Tokenized approve/deny emails (HMAC, single-use), approval API, in-dashboard approvals, deny/timeout handling. |
| **D. Funding + launch** | Per-party credit collection (party→platform), Stripe top-up when short, fund→launch on full approval, refunds on deny. |
| **E. Settlement + reporting** | Pro-rata reconciliation vs real spend (with Gate 4); per-party billing history + exportable RESPA audit record. |
| **F. Co-branding** | Dual/multi-logo on ad creative + co-marketed landing pages. |

## Open questions

1. **Partner funding source** — credits only, or also direct Stripe charge per party at
   approval time? (Affects onboarding: partners must be funded accounts.)
2. **agent↔agent** — confirm both are platform agents; do they need a JMA-equivalent or
   just a fair-value attestation?
3. **Required vs optional parties** — can a campaign launch if an *optional* partner
   denies (agent absorbs that share), or is every selected party required?
4. **Platform markup on partner spend** — does the tier markup apply to partner shares
   too, or only the agent's? (Revenue + RESPA fair-value interaction.)
5. **Refund mechanics** — credits back to balance vs Stripe refund for partner shares.
