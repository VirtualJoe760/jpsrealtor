---
title: Google Ads API — Standard Access Application (design document + answers)
status: current
last_verified: 2026-06-20
related:
  - google-ads-go-live.md
---

# Google Ads API — Standard Access Design Document

> **Use:** export the "Design Document" section below to **PDF** and upload it for
> Q7 of the Standard Access application. The "Form answers" section is the Q-by-Q
> script. Two things to confirm first (see end): the **API contact email** and the
> **Company type** in the API Center.

---

## DESIGN DOCUMENT — ChatRealty Google Ads Integration

### 1. Company & product overview
ChatRealty (operated by JPS & Company LLC) is a multi-tenant SaaS marketing platform
for licensed U.S. real estate agents. Through our Google Ads **manager account (MCC
206-304-7113)**, ChatRealty creates and manages **Search** and **Video (YouTube)**
advertising campaigns on each agent's **own** Google Ads account — on their behalf and
with their explicit, revocable consent. ChatRealty is the technology provider; the
agent is the advertiser and account owner.

### 2. Target audience & business model
- **Audience:** individual licensed real estate agents and small teams in the United States.
- **Monetization:** subscription tiers plus a prepaid **credit** system. Agents buy
  credits (a tier-based markup is applied **at purchase only**) that fund their ad spend
  and platform services. **ChatRealty does not mark up the ad spend itself** — credits
  convert to ad budget at face value. We never resell Google Ads inventory.

### 3. System architecture
- **Authentication:** each agent connects via **OAuth 2.0** (`scope:
  https://www.googleapis.com/auth/adwords`, `access_type=offline`). The refresh token is
  stored encrypted against the agent's user record. Consent is revocable by the agent at
  any time in Settings → Integrations.
- **MCC model:** the agent links their existing Google Ads account to ChatRealty's MCC
  (206-304-7113). API calls set `login-customer-id = MCC` and `customer-id = the agent's
  account`, so all management happens on the agent's own account under their consent.
- **Per-request credential isolation:** a per-request context (AsyncLocalStorage) threads
  the acting agent's `customerId` + `refreshToken` through every API call, so one agent's
  request can never touch another's account. The platform developer token is used as the
  `developer-token` header; the acting account is always the consenting agent's.
- **Stack:** Next.js (App Router) + MongoDB; Google Ads API REST (`v24`).

### 4. Google Ads API usage
- **Services/methods:** `CampaignBudgetService` (budgets), `CampaignService` (Search +
  Video campaigns), `AdGroupService`, `AdGroupAdService` (Responsive Search Ads, in-stream
  Video ads), `AssetService` (YouTube video assets), and `GoogleAdsService.SearchStream`
  for reporting/status.
- **Campaign types:** Search, Video (YouTube in-stream). Targeting is geo/radius-based
  for real-estate markets (cities, neighborhoods, listings).
- **Volume:** modest per-agent operation counts (campaign create + manage + report); well
  within Standard limits across the agent base.

### 5. User workflow
1. Agent connects Google via OAuth and selects their account (auto-discovered with
   `listAccessibleCustomers`).
2. Agent links their account to the ChatRealty MCC (manager link they accept in Google Ads).
3. Agent builds a campaign in the ChatRealty wizard (market, budget, headlines, creative).
4. ChatRealty creates the campaign on the agent's account **PAUSED** — the agent reviews
   targeting/bids in Google Ads, then enables it. (Nothing spends without the agent's review.)
5. ChatRealty reports campaign status/metrics back into the agent's dashboard.

### 6. Required Minimum Functionality (capabilities)
- **Campaign Creation** — Search & Video campaigns, budgets, ad groups, ads.
- **Campaign Management** — edit/pause/enable, budget changes.
- **Reporting** — campaign status + performance via `GoogleAdsService`.
- (No **Account Creation** — agents bring existing accounts. No third-party reselling.)

### 7. Data handling, consent & policy compliance
- We access an agent's account **only** with their OAuth consent + MCC link, both revocable.
- We do not sell, rent, or share agents' Google Ads data; it is used solely to operate
  their campaigns and show them reporting.
- Campaigns launch PAUSED for human review — no unattended/unauthorized spend.
- We comply with Google Ads policies and the API Terms; agents are responsible for their
  ad content and we surface policy/disapproval status to them.

### 8. Security
- OAuth refresh tokens encrypted at rest; least-privilege scoping (`adwords` only).
- Per-request account isolation (above) prevents cross-tenant access.
- TLS in transit; access controls on the platform.

---

## FORM ANSWERS (Q-by-Q)

| # | Question | Answer |
|---|---|---|
| 1 | Contact email accurate? | ✅ Yes (confirm/update in API Center first) |
| 2 | MCC ID | **206-304-7113** |
| 3 | Contact email | *(recommend a role alias, e.g. `google-ads-api@chatrealty.io`; else josephsardella@gmail.com)* |
| 4 | Ongoing relationship with a Google rep? | **No** |
| 5 | Company primary website | **https://chatrealty.io** |
| 6 | Business model / tool / audience / monetization | *Section 1–2 above, condensed:* "ChatRealty is a multi-tenant SaaS platform for U.S. real estate agents. Via our MCC we create & manage Search and YouTube campaigns on each agent's own Google Ads account, with their OAuth consent. We monetize through subscriptions + a prepaid credit system (markup at purchase only; ad spend is not marked up). Audience: individual agents and small teams." |
| 7 | Design documentation (.pdf/.doc/.rtf) | **Upload the PDF export of the Design Document above** |
| 8 | Accessible to users outside your org? | **Yes** (our agent customers use it) |
| 9 | Use token with a tool developed by someone else? | **No** (we built it) |
| 10 | Campaign types supported | **Search, Video** |
| 11 | Capabilities | **Campaign Creation, Campaign Management, Reporting** (not Account Creation) |
| 12 | Public homepage URL | **https://chatrealty.io** |
| 13 | Info accurate | ✅ (you check) |
| 14 | Accept Terms & Conditions | ✅ (you check + Submit) |

---

## Confirm before submitting

1. **API contact email** — Google prefers a **role-based alias** (e.g.
   `google-ads-api@chatrealty.io`) over a personal Gmail. Decide which; update it in the
   API Center → Developer Details if changing.
2. **Company type** — currently "Independent Google Ads Developer / manage my ads". For a
   tool that manages **clients'** accounts, a tool-provider/agency framing is more
   accurate and reduces review delays. Update intended-use wording to the multi-tenant
   model. (This is also the "update for manage clients" step.)
3. **Website** — the API Center lists `jpsrealtor.com`; the platform homepage is
   `chatrealty.io`. Use **chatrealty.io** as the public tool URL (Q5/Q12).
