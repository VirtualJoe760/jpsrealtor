---
title: Google Ads — Go-Live Runbook (developer token + MCC + production)
status: current
last_verified: 2026-06-20
related:
  - README.md
  - go-live-checklist.md
  - ../integrations/twilio.md
---

# Google Ads — Go-Live Runbook

## TL;DR

The code is **production-wired** (OAuth scope `adwords`, MCC `login-customer-id`,
per-agent credential threading, env-based config). Going live is gated by **external
Google approvals you must obtain**: a **developer token** (Test → Basic → Standard)
and the **MCC** manager-account links. This runbook is the exact path. Claude can
*guide / drive the browser* but **cannot accept Google's terms or submit the
application** — those are your actions.

## What's done vs what's yours

| Done (in repo) | Yours (external) |
|---|---|
| OAuth (client `JPSREALTOR`, scope `adwords`) — `api/auth/google-ads/*` | Apply for the **developer token** in the API Center |
| Per-agent creds (`User.adAccounts.google`) + ALS threading | Get token bumped **Test → Basic** (→ Standard for scale) |
| MCC routing via `login-customer-id` header | Approve **MCC links** for each agent account |
| Loud safety gate (no silent fallback) | Set production **env vars** + **billing** on the MCC |
| Search + YouTube campaign builders | — |

> **Status (verified 2026-06-20, in the API Center):** a developer token **already
> exists at `Basic Access`** (production-capable, 15k ops/day) on MCC 206-304-7113.
> Registration: company "chatRealty", type "Independent Google Ads Developer",
> intended use "manage my ads". **To go live: copy that token into prod env
> `GOOGLE_ADS_DEVELOPER_TOKEN`.** The registration is framed single-advertiser — update
> it to the multi-tenant "manage clients' accounts" use-case AFTER going live (changing
> it may trigger a re-review; don't disrupt working Basic access), and pursue Standard
> Access for scale.

## Step 1 — Developer token (Google Ads API Center)

1. Sign into the **MCC manager account** (ChatRealty's: **206-304-7113**) at ads.google.com.
2. **Tools → Setup → API Center** (only visible on a manager account).
3. Fill the API access form: company name, **website** (chatrealty.io), contact email,
   and the **API use description** — describe ChatRealty as a multi-tenant platform
   that creates/manages Search & Video campaigns on agents' own Google Ads accounts via
   the MCC, on their behalf and with their consent.
4. Accept the **Google Ads API Terms** (your action) → you receive a **Test** token.
5. Apply for **Basic Access** (form in the same API Center). Basic is usually approved
   in ~1–3 business days and unlocks **production** accounts (15k operations/day).
6. Put the token in **`GOOGLE_ADS_DEVELOPER_TOKEN`** (prod env). That's it — the code
   reads it from env (platform default) or per-agent.

> Test tokens can ONLY call test accounts — nothing real launches until Basic is granted.

## Step 2 — Standard Access (for scale)

Basic caps at 15k ops/day. For many agents you'll want **Standard**. Google **reviews
your tool** against the **Required Minimum Functionality (RMF)** and API policies:
- Your tool must provide real management/reporting value (we create campaigns, ad
  groups, ads, budgets, and report status — qualifies).
- Compliance: honor account access only with the user's consent (we do — per-agent
  OAuth + MCC link), no policy-violating automation, clear data handling.
- They may ask for a **screencast/demo** of the tool managing a campaign end-to-end.

Action: submit the Standard Access request in the API Center; be ready to demo the
campaign wizard → launch (PAUSED) → status flow.

## Step 3 — MCC + agent account linking

- Each agent connects Google in **Settings → Integrations** (OAuth) and selects their
  **customerId** (auto-discovered via `listAccessibleCustomers`).
- To manage their account under our token, the agent's account must be **linked to the
  MCC**: we send a manager link request from MCC 206-304-7113 → the agent **accepts** in
  their Google Ads account. (`AdAccountsSetup` shows this instruction.)
- At launch, `loginCustomerId = MCC` + `customerId = agent` → the `login-customer-id`
  header routes the call. Already wired in `google-ads-api.ts`.

## Step 4 — Production env vars

| Var | Purpose |
|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | the approved token |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC id `2063047113` (no dashes) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client `JPSREALTOR` |
| `GOOGLE_ADS_CUSTOMER_ID` / `GOOGLE_ADS_REFRESH_TOKEN` | platform-account fallback (optional; agents supply their own) |

## Step 5 — API version ✅ bumped v18 → v24 (verify shapes live)

**v18 was already SUNSET** (dead — all calls would 404/error). As of 2026-06 Google
keeps ~4 majors live (v21→v24.1); we bumped `GOOGLE_ADS_API_VERSION` to **`v24`** (the
latest major; REST paths use the major only). **Action:** on the first live launch,
verify the request/field shapes against the v24 reference — some enums/fields shift
across 6 majors. Core campaign/budget/ad-group/ad mutates are stable, but validate.

**Heads-up for retargeting (future):** as of 2026-04, **Customer Match** for new
adopters must go through the **Data Manager API**, not the Ads API user-data services.
Plan audience/remarketing work around Data Manager.

## Step 6 — Close the billing leak before real spend 💸

Today: launch does a **credit balance check** but **never debits** (campaigns launch
PAUSED; `launch-ads/route.ts` has a `TODO: daily cron to debit credits`). Once agents
**enable** campaigns in Google Ads Manager, **spend is not billed**. Before real money
flows, build the **daily ad-spend debit** (query each live campaign's actual cost →
`debit()` via the canonical `CreditLedger`, idempotent per campaign/day). This is the
last third of the 3-tier model (purchase markup → balance check → **daily debit**).

## Step 7 — Live-launch flow (by design)

All campaigns launch **PAUSED** so the agent reviews bids/targeting in Google Ads
Manager, then enables. Keep this — it's a safety/quality gate, and it's also why the
daily-debit cron (not a launch-time debit) is the correct billing mechanism.

## Gotchas

- **Nothing launches for real on a Test token** — Basic is the unlock.
- **The dev token is platform-level** (one token, all agents) under the MCC; agents
  don't need their own token, just to link their account to the MCC.
- **`login-customer-id` must be the MCC** when managing a sub-account, or calls 403.
- **Daily debit is missing** — don't enable real campaigns at scale until it's built.
- **API version drift** — v18 will sunset; pin to a supported version.
