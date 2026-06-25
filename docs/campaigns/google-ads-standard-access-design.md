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
> script. Model: ChatRealty **provisions accounts** for agents under the MCC
> (Account Creation capability). Monetization is stated **positively** — what we do,
> with no forward commitments about charging.

---

## DESIGN DOCUMENT — ChatRealty Google Ads Integration

### 1. Company & product overview
ChatRealty (operated by JPS & Company LLC) is a multi-tenant SaaS marketing platform
for licensed U.S. real estate agents. ChatRealty **provisions a dedicated Google Ads
account for each agent under our manager account (MCC 206-304-7113)** and creates and
manages **Search** and **Video (YouTube)** campaigns within it — on the agent's behalf
and with their explicit, revocable consent. ChatRealty is the technology provider and
account manager; the agent is the advertiser whose business the ads promote.

### 2. Target audience & business model
- **Audience:** individual licensed real estate agents and small teams in the United States.
- **Monetization:** subscription plans plus a prepaid credit system. Agents purchase
  credits that fund their advertising spend and platform services.

### 3. System architecture
- **Account provisioning:** when an agent joins, ChatRealty creates a dedicated Google Ads
  client account under our MCC (`CustomerService.CreateCustomerClient`) so the agent has
  **no account setup to perform**. Billing is consolidated under the MCC; agents prepay via
  credits and every campaign is **budget-capped**, so spend cannot exceed what the agent
  has funded.
- **Asset linking:** the agent links their own assets with one-click approvals — e.g. their
  YouTube channel (for video ads), website, and conversion/analytics data. Assets remain
  owned by the agent and access is revocable.
- **Account management & isolation:** every API call sets `login-customer-id = MCC` and
  operates on the specific agent's account (`customer-id`), so each agent's campaigns are
  isolated to their own account. The platform developer token is the `developer-token` header.
- **Authentication:** OAuth 2.0 (`scope: adwords`); agents authenticate to link assets and
  authorize management, with revocable consent in Settings → Integrations.
- **Stack:** Next.js (App Router) and MongoDB; Google Ads API REST (`v24`).

### 4. Google Ads API usage
- **Services/methods:** `CustomerService` (provision client accounts under the MCC),
  `CampaignBudgetService` (budgets), `CampaignService` (Search & Video campaigns),
  `AdGroupService`, `AdGroupAdService` (Responsive Search Ads, in-stream Video ads),
  `AssetService` (YouTube video assets), and `GoogleAdsService.SearchStream` for reporting.
- **Campaign types:** Search, Video (YouTube in-stream). Targeting is geo/radius-based for
  real-estate markets (cities, neighborhoods, listings).
- **Volume:** modest per-agent operation counts (provision, create, manage, report); well
  within Standard limits across the agent base.

### 5. User workflow
1. Agent signs up on ChatRealty.
2. ChatRealty **provisions a dedicated Google Ads account** for them under our MCC — no
   account setup for the agent.
3. Agent **links their assets** (YouTube channel, website, conversion data) with one-click
   approvals.
4. Agent builds a campaign in the ChatRealty wizard (market, budget, headlines, creative).
5. ChatRealty creates the campaign **PAUSED**; it is reviewed and explicitly approved before
   being enabled — no unattended spend.
6. ChatRealty reports campaign status and metrics back into the agent's dashboard.

### 6. Required Minimum Functionality (capabilities)
- **Account Creation** — provision a dedicated Google Ads account per agent under our MCC.
- **Campaign Creation** — Search and Video campaigns, budgets, ad groups, ads.
- **Campaign Management** — edit/pause/enable, budget changes.
- **Reporting** — campaign status and performance via `GoogleAdsService`.

### 7. Data handling, consent & policy compliance
- We provision and manage an agent's account and assets only with their explicit, revocable consent.
- Agent assets and data are used solely to operate their campaigns and provide reporting; we
  do not sell or rent agents' data.
- Campaigns launch PAUSED for review — no unattended or unauthorized spend — and are
  budget-capped to the agent's prepaid credits.
- We operate within Google Ads policies and the Google Ads API Terms; agents are responsible
  for their ad content, and we surface policy/disapproval status to them.

### 8. Security
- OAuth tokens encrypted at rest; least-privilege scoping (`adwords` only).
- Per-account isolation under the MCC prevents cross-tenant access.
- TLS in transit; access controls on the platform.

---

## FORM ANSWERS (Q-by-Q)

| # | Question | Answer |
|---|---|---|
| 1 | Contact email accurate? | ✅ Yes |
| 2 | MCC ID | **206-304-7113** |
| 3 | Contact email | **josephsardella@gmail.com** |
| 4 | Ongoing relationship with a Google rep? | **No** |
| 5 | Company primary website | **https://chatrealty.io** |
| 6 | Business model / tool / audience / monetization | "ChatRealty is a multi-tenant SaaS platform for U.S. real estate agents. We provision a dedicated Google Ads account for each agent under our MCC and create & manage their Search and YouTube campaigns, with their consent and one-click asset linking. We monetize through subscription plans and a prepaid credit system that funds advertising spend and platform services. Audience: individual agents and small teams." |
| 7 | Design documentation (.pdf/.doc/.rtf) | **Upload the PDF of the Design Document above** |
| 8 | Accessible to users outside your org? | **Yes** |
| 9 | Use token with a tool developed by someone else? | **No** |
| 10 | Campaign types supported | **Search, Video** |
| 11 | Capabilities | **Account Creation, Campaign Creation, Campaign Management, Reporting** |
| 12 | Public homepage URL | **https://chatrealty.io** |
| 13 | Info accurate | ✅ (you check) |
| 14 | Accept Terms & Conditions | ✅ (you check + Submit) |

---

## Pre-submit status

- ✅ **Company type** updated to **Agency/SEM** (manages campaigns for clients).
- ✅ **Intended use** updated to the manage-clients wording.
- Contact email: **josephsardella@gmail.com** (kept).
- Website used in the form: **chatrealty.io** (API Center "Company URL" still lists
  jpsrealtor.com — optional to align).
