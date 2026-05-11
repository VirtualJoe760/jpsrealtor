# Multi-Tenant Ad Campaign Architecture

**Status:** Plan (not yet implemented)
**Last updated:** 2026-05-10

## Billing model

Each agent connects their own Meta Business Account and adds ChatRealty as an
authorized Partner / Manager. We deploy campaigns on the agent's account via
the Meta Marketing API; **Meta bills the agent's card directly**. We never
touch ad spend money.

| Step | Where money moves |
|------|------------------|
| Agent subscribes / tops up | Agent → ChatRealty (Stripe). Credits added at marked-up rate. |
| Agent launches a $50/day campaign | Credits reserved against their balance. Meta API called against agent's ad account. |
| Meta runs the ad | Meta bills **agent's** card on file (their Meta payment method). |
| Nightly cron | Pulls real spend from Meta `/insights`, settles credits against actual spend. |
| Campaign ends with unused reserve | Unused credits refund to available balance. |

**Our revenue:** the markup banked at credit purchase (25% / 20% / 15% by tier).
Credits = a prepaid management ceiling, not ad-spend dollars.

## Credit accounting model

Adopting **reserve at launch + nightly settle**:

```
balance:          total credits in the ledger (available + reserved)
availableCredits: spendable now (balance − reserved)
reservedCredits:  locked against active campaigns
```

New transaction types on `CreditLedger`:

- `reservation_lock` — credits moved from available → reserved at launch
- `reservation_settle` — reserved credits debited against actual Meta spend
- `reservation_release` — campaign ended/paused, leftover reserve refunded

Per-campaign reserve tracking on the `Campaign` model:

```ts
creditReserve: {
  reservedCredits: number;        // currently locked for this campaign
  settledCredits: number;         // cumulative actual spend converted to credits
  lastSettledAt: Date;
  reserveWindowDays: number;      // default 7 — how far ahead we lock
  metaSpendCumulativeCents: number; // last-known from Meta /insights
}
```

## Phases

### Phase 1 — Fix per-user credentials (correctness)

**Why first:** today, `meta-ads-api.ts` `getConfig()` is called with no argument
in every code path, so every launch falls back to the env-var token. Every
agent's launches currently run on **ChatRealty's** Meta account. This is a
silent multi-tenant bug; nothing else matters until it's fixed.

**Changes:**
- `meta-ads-api.ts` / `google-ads-api.ts`: thread `userAdAccounts` through
  every public function. `metaRequest()` already accepts but ignores config.
- `launch-ads/route.ts`: pass `userMetaAds` / `userGoogleAds` to API helpers.
- `isMetaAdsConfigured(userAdAccounts?)` / `isGoogleAdsConfigured(userAdAccounts?)`
  read from user creds when provided.

**Acceptance:** an agent with their own connected Meta account sees a launched
campaign appear in **their** Ads Manager, not ChatRealty's.

### Phase 2 — Meta OAuth flow (onboarding)

**Why second:** users currently paste in their Meta access token manually —
fine for testing, terrible UX. Google already has an OAuth flow at
`/api/auth/google-ads/connect`; Meta needs the same.

**Changes:**
- New `/api/auth/meta-ads/connect` route — redirects to Facebook OAuth dialog
  with `ads_management`, `business_management`, `pages_show_list`,
  `pages_manage_ads` scopes.
- New `/api/auth/meta-ads/callback` route — exchanges code for long-lived
  token, lists ad accounts the user has access to.
- Add "select ad account + page" UI to `AdAccountsSetup.tsx`.
- Add an instructions panel: how to add ChatRealty as an authorized Partner
  in Meta Business Settings → Partners.
- Store `userId` (FB ID), `accessToken`, `tokenExpiresAt`, `businessId`,
  `adAccountId`, `pageId`, `connectedAt`, `status` on `User.adAccounts.meta`.

**Token refresh:** long-lived tokens last ~60 days. Add a daily cron to
refresh tokens older than 50 days via `oauth/access_token?grant_type=fb_exchange_token`.

### Phase 3 — Reserve at launch

**Why third:** the immediate functional complaint — credits aren't actually
being deducted at launch. `launch-ads/route.ts:53` says "Campaigns launch
PAUSED, so we don't debit credits now" with a TODO. With Phase 1 done and the
ledger split into `available` + `reserved`, we can do real accounting.

**New library functions in `src/lib/credits.ts`:**

```ts
reserve({ userId, campaignId, credits })
  → moves credits from available → reserved
  → throws if availableCredits < credits

settle({ userId, campaignId, actualSpendCents })
  → debits matching credits from reserved
  → records reservation_settle transaction
  → returns { creditsDebited, reserveRemaining }

releaseReservation({ userId, campaignId })
  → moves remaining reserved → available
  → records reservation_release transaction

topUpReserve({ userId, campaignId, credits })
  → moves additional credits from available → reserved (for next 7-day window)
```

**`launch-ads/route.ts` changes:**
- Replace the soft credit check with `reserve()` call for
  `dailyBudget × min(durationDays || 7, 7)` credits.
- On Meta/Google API success → persist `creditReserve` on campaign.
- On API failure → release the reservation (refund).
- Insufficient-credits response now references `availableCredits`, not balance.

**Acceptance:** launching a $50/day campaign locks 500 × 7 = 3,500 credits.
Agent's balance UI shows balance unchanged but `availableCredits` decreased.

### Phase 4 — Nightly settle cron

**Why fourth:** Phase 3 reserves credits but never actually charges them.
Phase 4 reconciles against real Meta spend.

**Cron:** `GET /api/cron/credits-settle` (called by VPS cron daily)

For each `Campaign` with `creditReserve.reservedCredits > 0`:

1. Call Meta `/insights` for the campaign — get `spend` field (USD) since last
   settle.
2. Convert dollars → credits at universal $0.10 rate.
3. `settle({ userId, campaignId, actualSpendCents })` — debits credits from
   reserve, updates `metaSpendCumulativeCents` + `lastSettledAt`.
4. If reserve runs low (< 1 day's budget): `topUpReserve()` from available
   balance for the next 7-day window.
5. If balance can't cover top-up: **pause the Meta campaign via API**, mark
   `Campaign.status = 'paused_insufficient_credits'`.
6. If campaign has ended (Meta status = COMPLETED or past endDate):
   `releaseReservation()` to refund remaining reserve.

**Failure modes:**
- Cron lags → ad runs slightly ahead of credit debit (limited by reserve window).
- Meta `/insights` returns stale data → next run catches up.
- Reserve runs dry mid-day → campaign pauses next cron cycle (acceptable
  lag because Meta won't bill significantly faster than the reserve).

### Phase 5 — Onboarding prompt + escrow display

**Why last:** UX polish that benefits from Phases 1–4 being live.

**Onboarding step:** add a "Connect Meta" step to the agent setup wizard
right after profile creation. Block campaign launch behind it (or warn).

**Credits-in-escrow display:** new UI on the agent dashboard:

```
┌───────────────────────────────────────────┐
│ Credits                                    │
│                                            │
│ Available: 8,420                           │
│ In Escrow:   276  (across 2 active ads)    │
│ Total:      8,696                          │
└───────────────────────────────────────────┘
```

Plus per-campaign card showing:

```
Monte Vina — Meta Retargeting
  Reserved: 350 credits (7-day window)
  Spent so far: 124 credits ($12.40)
  Refills nightly · Next refill: 226 credits
```

## Audit findings (current state)

These already exist and don't need to be built:

- `User.adAccounts.{meta,google}` schema fields
- `/api/agent/ad-accounts` save/load endpoint
- `AdAccountsSetup.tsx` manual paste-in UI
- `meta-ads-api.ts` / `google-ads-api.ts` `getConfig(userAdAccounts?)` signature
- `CreditLedger` (formerly `PointsLedger`) with `creditPoints` / `debitPoints`
- Google has OAuth (`/api/auth/google-ads/connect`)
- Unified credits config + lib (`src/config/credits.ts`, `src/lib/credits.ts`)
- Quote / balance API (`/api/credits/quote`, `/api/credits/balance`)

These have known bugs to fix in Phase 1:

- Per-user creds are read but never threaded to API calls (every launch
  silently uses env-var token)
- Credit check at launch is a soft check, not a debit (`launch-ads/route.ts:53`)

## Open questions

- **Token revocation:** when an agent disconnects Meta, do we pause all their
  active campaigns immediately or let them run until the reserve drains?
- **Failed Meta payment:** if Meta fails to charge agent's card (their bank
  declines), the campaign auto-pauses on Meta's side. Do we want to expose
  that status in our UI separately from `paused_insufficient_credits`?
- **Refund rounding:** spend in $0.01 increments, credits in whole-credit
  increments. Settle math should round down debits (favor agent) and refund
  the difference at campaign end.
- **Pricing display:** show agent both the credit cost AND the actual dollar
  ad spend equivalent on the launch screen, so they understand what Meta
  will bill them. ($50/day campaign = 500 credits/day debited from balance,
  + Meta bills your card ~$50/day separately.)

## References

- `src/lib/credits.ts` — credit operations
- `src/config/credits.ts` — credit math
- `src/models/CreditLedger.ts` — ledger storage
- `src/lib/meta-ads-api.ts` — Meta Marketing API client
- `src/lib/google-ads-api.ts` — Google Ads API client
- `src/app/api/campaigns/[id]/launch-ads/route.ts` — launch entry point
- `src/app/components/campaigns/AdAccountsSetup.tsx` — connection UI
