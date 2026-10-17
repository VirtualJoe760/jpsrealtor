---
title: Commission transactions, partnerships, and (parked) Stripe Identity
status: current
last_verified: 2026-10-17
related: [README.md, ../campaigns/co-marketing-adspend.md, ../agent-onboarding/README.md]
---

# Transactions, partnerships, and Stripe Identity

## TL;DR

Three commerce pieces that sit beside subscriptions and credits.
**`Transaction`** is a schema for closed-deal commission maths that **nothing in
the app reads or writes yet**. **`Partnership`** is the live agent ↔ service-partner
cost-sharing record. **Stripe Identity** (ID checks for agent applicants) is
built but **parked**. Moved out of `README.md` on 2026-10-17 to keep the area
README short.

## Transactions (commission tracking) — schema only

`src/models/Transaction.ts` has no importers anywhere in `src/` or `scripts/`
(checked 2026-10-17); `src/models/AgentMatch.ts`, which it references, is in
the same state. What the schema would record: parties, sale price, commission
percentages, stacked fees, attribution, timeline events, uploaded documents.
Its pre-save hook (`Transaction.ts:293`) computes:

```
commission.totalCommissionAmount = salePrice * (totalCommissionRate / 100)
each fee.amount = totalCommissionAmount * (fee.percentage / 100)
commission.agentNetCommission = agentGrossCommission - sum(fee.amounts)
```

| Fee type (`FeeType`) | Default % | Recipient | When applied |
|---|---:|---|---|
| `swipe_match` | 15% | platform (ChatRealty) | Deal came from a swipe match (`feeTracking.swipeMatchFee.agentMatchId`) |
| `referral` | 25% | referring agent | An out-of-area agent referred the client |
| `data_broker` | 5% | agent or team | The agent/team that provided MLS access |
| `handoff` | 5% | handoff agent | Lead was handed off mid-pipeline |
| `company_split` | variable | brokerage | The brokerage's share |

`feeTracking` is a denormalized copy keyed by fee type, for reporting;
`commission.fees[]` drives the maths. **Attribution** carries `source`
(`swipe_match | ai_chat | map_search | direct_contact | referral | open_house |
other`), `cookieId`, `sessionId`, `initialContactDate`, and optional links to
`AgentMatch` and representation-agreement documents.

## Partnership (cost-sharing under RESPA)

`src/models/Partnership.ts` models an agent ↔ service-provider relationship
(mortgage, title, etc.) for cost-shared marketing under a RESPA Joint Marketing
Agreement.

- One partnership per pair: unique index on `(agentId, servicePartnerId)`.
- **Cost split:** `equal` | `percentage` (`agentPercentage` / `partnerPercentage`)
  | `fixed` (`fixedAgentAmount` / `fixedPartnerAmount`), capped by
  `maxMonthlyContribution`.
- **RESPA fields:** `jointMarketingAgreement`, `jmaDocumentUrl` (Cloudinary),
  `jmaSignedAt`, `agreedToTerms`.
- `campaigns[]` (refs to `Campaign`) and `billingHistory[]` (per-campaign
  `agentShare` / `partnerShare`, paid flags, optional `stripeInvoiceId`).
- Status: `pending | active | suspended | terminated`.

The co-marketing funding flow that actually moves credits between the two
sides is documented in
[../campaigns/co-marketing-adspend.md](../campaigns/co-marketing-adspend.md).
The admin Overview shows a partnership count but there is no admin page for
partnerships.

## Stripe Identity (KYC) — PARKED

Parked since 2026-07-23: the live signup flow goes `inquiry_pending →
final_approved` and never sets `inquiry_approved`, so none of this runs. The
files carry a `PARKED (2026-07-23)` header; keep them, but don't wire them up
without a decision ([../agent-onboarding/README.md](../agent-onboarding/README.md)).
What the code would do:

1. Applicant reaches phase `inquiry_approved`.
2. `POST /api/agent/verify-identity` calls `createIdentityVerificationSession()`
   (`src/lib/stripe-identity.ts`) with `type: "document"` plus ID-number, live
   capture and matching-selfie requirements, and returns Stripe's `url`.
3. `POST /api/webhooks/stripe-identity` (signature-verified with
   `STRIPE_IDENTITY_WEBHOOK_SECRET`) handles
   `identity.verification_session.verified` → `phase = "verification_complete"`
   + success email; `requires_input` → retry email; `canceled` / `processing` →
   logged only.
