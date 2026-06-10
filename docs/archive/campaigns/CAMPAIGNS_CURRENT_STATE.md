# Campaign System — Current State Reference

> Last Updated: 2026-05-11 | Branch: main

---

## What Exists

### Campaign Detail Panel — 5 Tabs

| Tab | Purpose |
|-----|---------|
| **Strategy** (was Overview) | Pick a strategy + see which are running. Routes to the right wizard. |
| **Contacts** | Per-campaign contact manager |
| **Active** (was History) | Voicemail / text / email activity log |
| **Manage** (new) | List + control every Meta/Google ad campaign linked to this parent. Pause, resume, extend, delete, bulk-delete orphans. |
| **Analytics** | Ad performance metrics + per-platform pause/resume (legacy AnalyticsTab) |

### 3 Strategy Cards (Strategy Tab)

| Card | Wizard | Status |
|------|--------|--------|
| **Voice Mails** | `CampaignPipelineWizard` | Working — Drop Cowboy + 11Labs |
| **Direct Mail** | `DirectMailPipelineWizard` | Working — thanks.io API wired |
| **Digital Ads** (was Community Ads) | `CommunityAdWizard` | **Working end-to-end** — Meta retargeting verified launching to Meta Ads Manager (May 11, 2026). Google PPC + YouTube wired in UI; Google needs ad-account OAuth + dev token; YouTube uses same Google path. |

### Create New Campaign Flow

5-step wizard: Type → Details → Strategies → Contacts → Review

---

## Files

### Models

| File | Purpose |
|------|---------|
| `src/models/Campaign.ts` | Main campaign model — strategies, configs, stats |
| `src/models/DirectMailPiece.ts` | Individual mail piece tracking |
| `src/models/AdCampaignRecord.ts` | Per-launch record of platform IDs + metrics snapshots |
| `src/models/ContactCampaign.ts` | Junction: contacts ↔ campaigns |
| `src/models/VoicemailScript.ts` | Per-contact voicemail scripts |
| `src/models/CampaignExecution.ts` | Execution history |
| `src/models/CreditLedger.ts` (new) | Credit balance + transaction history. Stored in `pointsledgers` collection for back-compat. |
| `src/models/PointsLedger.ts` | **Shim** — re-exports CreditLedger for legacy callers |
| `src/models/User.ts` | Extended `adAccounts.meta` with token expiry, page/business names, available lists (for OAuth-driven account/page picking) |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/campaigns/create` | POST | Create campaign + contacts |
| `/api/campaigns/list` | GET | List all campaigns |
| `/api/campaigns/[id]` | GET/DELETE | Single campaign CRUD |
| `/api/campaigns/[id]/contacts` | GET/POST | Manage contacts |
| `/api/campaigns/[id]/save-ads` | POST | Save Google/Meta ad config as draft |
| `/api/campaigns/[id]/launch-ads` | POST | Launch Google PPC + Meta retargeting |
| `/api/campaigns/[id]/send-mail` | POST | Send direct mail via thanks.io |
| `/api/campaigns/[id]/send` | POST | Send voicemail (full pipeline) |
| `/api/campaigns/[id]/send-simple` | POST | Send voicemail (pre-recorded) |
| `/api/campaigns/[id]/scripts/*` | CRUD | Script management |
| `/api/campaigns/[id]/generate-scripts` | POST | AI script generation |
| `/api/campaigns/[id]/generate-audio` | POST | 11Labs audio synthesis |
| `/api/campaigns/[id]/history` | GET | Execution history (voicemail/text/email) |
| `/api/campaigns/[id]/ad-metrics` | GET | Live ad metrics (Meta/Google insights) |
| `/api/campaigns/[id]/ad-status` | POST | Pause/resume legacy single linked campaign |
| `/api/campaigns/[id]/ad-runs` (new) | GET | **List all Meta campaigns** in connected ad account matching this parent's name prefix. Flags orphans (in Meta but not in our DB). |
| `/api/campaigns/[id]/ad-runs` (new) | DELETE | `?platform=meta&externalId=XXX` — deletes campaign on Meta + cleans AdCampaignRecord + clears `campaign.metaAdsConfig` if it was the active link. |
| `/api/campaigns/[id]/ad-runs` (new) | PATCH | `?platform=meta&externalId=XXX` body `{status?, endTime?}` — pause/resume on the Campaign object; endTime fans out to each AdSet under the campaign. |
| `/api/campaigns/[id]/recordings/list` | GET | Drop Cowboy recordings |
| `/api/agent/ad-accounts` | GET/POST/DELETE | Ad platform credentials (reads from `User.adAccounts`) |
| `/api/auth/google-ads/connect` | GET | Google OAuth initiation |
| `/api/auth/google-ads/callback` | GET | Google OAuth callback |
| `/api/auth/meta-ads/connect` (new) | GET | Meta Business OAuth — requests `ads_management`, `business_management`, `pages_*` scopes. CSRF via HMAC state. |
| `/api/auth/meta-ads/callback` (new) | GET | Short→long token swap (~60 days). Fetches `/me/adaccounts` + `/me/accounts`, auto-picks first of each, stores everything on `User.adAccounts.meta`. |
| `/api/auth/meta-ads/disconnect` (new) | POST | Clears stored Meta tokens. |
| `/api/credits/balance` (new) | GET | Current credit balance + tier + recent transactions |
| `/api/credits/quote` (new) | POST | Preview cost for any operation (discriminated by `type`) |
| `/api/neighborhoods/reference` | GET | Hierarchy for page selector. **New `?search=` param** for global subdivision search (used by wizard unified search). |
| `/api/thanksio/webhook` | POST | Delivery/scan event handler |

### Frontend Components

| File | Purpose |
|------|---------|
| **Pages** | |
| `src/app/agent/campaigns/page.tsx` | Campaign list (grid/list view) |
| `src/app/agent/campaigns/new/page.tsx` | Create campaign wizard |
| `src/app/agent/settings/page.tsx` | Agent settings (now includes Integrations tab) |
| `src/app/data-deletion/page.tsx` (new) | Public data deletion instructions — required for Meta App Review |
| **Campaign Detail** | |
| `src/app/components/campaigns/CampaignCard.tsx` | Campaign card (grid/list) |
| `src/app/components/campaigns/CampaignDetailPanel.tsx` | Slide-out detail panel. Contains 5 tabs incl. new `ManageTab` (lists ad-runs, delete/pause/extend/bulk-delete) |
| `src/app/components/campaigns/CampaignOverview.tsx` | Strategy cards + wizard routing |
| `src/app/components/campaigns/ContactSelector.tsx` | Contact selection with tag pills |
| `src/app/components/campaigns/AdAccountsSetup.tsx` | Meta paste-in form replaced with **"Connect Meta Business"** OAuth button + dropdowns for Ad Account / Page selection |
| `src/app/components/campaigns/PinDropMap.tsx` | Leaflet map for geo targeting |
| **Pipeline Wizards** | |
| `pipeline/CampaignPipelineWizard.tsx` | Voicemail wizard (simple + full mode) |
| `pipeline/DirectMailPipelineWizard.tsx` | Direct mail wizard |
| `pipeline/CommunityAdWizard.tsx` | Meta + Google PPC + YouTube wizard (per-channel toggles, multi-select audiences, calendar schedule, unified page search, Buy/Sell/Community variant toggle) |
| `pipeline/PipelineStepIndicator.tsx` | Dynamic step indicator |
| `pipeline/PipelineContactsStep.tsx` | Shared contacts step |
| `pipeline/PipelineScriptsStep.tsx` | Voicemail script generation |
| `pipeline/PipelineReviewStep.tsx` | Script review/edit |
| `pipeline/PipelineAudioStep.tsx` | Audio generation (full mode) |
| `pipeline/PipelineAudioSimpleStep.tsx` | Audio selection (simple mode) |
| `pipeline/PipelineSendStep.tsx` | Voicemail send (full) |
| `pipeline/PipelineSendSimpleStep.tsx` | Voicemail send (simple) |
| **UI** | |
| `src/app/components/ui/calendar.tsx` (new) | shadcn-style date-range picker (react-day-picker) used by Meta schedule |
| **Auth UI** | |
| `src/app/auth/signin/page.tsx` | "Sign in with Facebook" button enabled |
| `src/app/auth/signup/page.tsx` | "Sign up with Facebook" button added |
| **Settings** | |
| `src/app/agent/settings/components/SettingsSidebar.tsx` | New **Integrations** step containing `AdAccountsSetup` |
| **Unused (can delete)** | |
| `pipeline/DigitalAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |
| `pipeline/GoogleAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |
| `pipeline/MetaAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |

### API Clients & Libs (src/lib/)

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/google-ads-api.ts` | Google Ads REST API v18 | Ready — needs refresh token |
| `src/lib/meta-ads-api.ts` | Meta Marketing API v21 | **Working end-to-end.** Uses `AsyncLocalStorage` (`runWithMetaCreds`) for per-user credentials. New helpers: `listCustomAudiences`, `createWebsiteCustomAudience`, `resolveAudienceIdsForLaunch`. |
| `src/lib/thanksio.ts` | Thanks.io direct mail API | Ready — API key working |
| `src/lib/credits.ts` (new) | Unified credit operations: `quote`, `getBalance`, `debit`, `credit`, `ensureBalance`. (NOTE: `reserve`/`settle` are NOT yet implemented — earlier drafts of this doc claimed stubs that don't exist. Planned in `docs/campaigns/README.md` Phase 3.) |

### Config (src/config/)

| File | Purpose |
|------|---------|
| `src/config/credits.ts` (new) | **Single source of truth.** `CREDIT_SPEND_VALUE = $0.10`. Tier purchase rates with markup. Direct mail per-piece costs. All conversion helpers. |
| `src/config/credit-costs.ts` | **Shim** — re-exports from `credits.ts` |
| `src/config/stripe-prices.ts` | Updated tier credit grants (1,000 / 4,167 / 8,696). Prices unchanged. |

### Documentation

| File | Content |
|------|---------|
| `docs/campaigns/CAMPAIGN_SYSTEM_VISION.md` | Original architecture vision |
| `docs/campaigns/AD_PLATFORMS_OPTIONS.md` | Google + Meta platform capabilities |
| `docs/multi-tenant/advertising/campaign-multi-tenant.md` (new) | **5-phase plan** for multi-tenant ad management (creds threading → Meta OAuth → reserve-at-launch → nightly settle → onboarding) |
| `docs/ad-campaign-setup/PAID_ADS_STRATEGY_RESEARCH.md` | Keyword data, benchmarks, strategies |
| `docs/thanks/THANKSIO_INTEGRATION.md` | Thanks.io API reference + use cases |
| `docs/google-ads/GOOGLE_ADS_API_DESIGN_DOC.md` | Google API design doc for app review |
| `docs/security/SECURITY_AUDIT_2026-04-21.md` | Security audit findings |

---

## Campaign Model Schema (Key Fields)

```typescript
{
  // Identity
  name, description, type, neighborhood,

  // Strategies (toggleable)
  activeStrategies: {
    voicemail, email, text,                 // legacy outreach
    directMail, googleAds, metaAds          // marketing channels
  },

  // Channel Configs
  dropCowboyConfig: { campaignId, callerId, retryAttempts },
  thanksioConfig: { mailType, frontImageUrl, message, handwritingStyle, qrUrl, returnAddress },
  googleAdsConfig: { campaignId, adGroupId, budget, bidStrategy, geoTargeting, headlines, descriptions, landingPageUrl },
  metaAdsConfig: { campaignId, adSetId, adId, objective, budget, geoTargeting, placements, headline, primaryText, imageUrl },
  radiusConfig: { center, radiusMiles, address },

  // Stats
  stats: {
    totalContacts, scriptsGenerated, audioGenerated,
    sent, delivered, listened, failed,            // voicemail
    mailSent, mailDelivered, qrScans,             // direct mail
    adImpressions, adClicks, adConversions, adSpend  // digital ads
  },

  // Status flow
  status: draft → importing_contacts → generating_scripts → generating_audio → review → approved → submitted → active → completed
}
```

## User.adAccounts.meta (Updated)

```typescript
adAccounts: {
  google?: { customerId, developerToken, refreshToken, connectedAt, status },
  meta?: {
    adAccountId, adAccountName,
    accessToken, tokenExpiresAt,              // long-lived user token (~60d)
    pageId, pageName, pageAccessToken,
    businessId, businessName,
    availableAdAccounts: Array<{id, name, businessId, businessName}>,
    availablePages: Array<{id, name}>,
    connectedAt, status
  }
}
```

---

## Credits System (New)

**Model:** 1 credit = $0.10 universal spend value. Markup applied at PURCHASE, not at SPEND.

| Tier | Monthly Price | Credits Granted | Markup |
|------|---------------|-----------------|--------|
| Beginner | $125 | 1,000 | 25% |
| Experienced | $500 | 4,167 | 20% |
| Top Agent | $1,000 | 8,696 | 15% |
| Custom Top-up | (variable) | (variable) | 15% |

Storage stays in `pointsledgers` collection (no migration). Model is canonical `CreditLedger`; `PointsLedger.ts` is a back-compat shim.

Operations go through `src/lib/credits.ts`:
- `quote({ type, params })` — preview cost
- `getBalance(userId)`
- `debit/credit(userId, credits, reason, metadata)`
- `ensureBalance(userId, requiredCredits)`

---

## Credentials Status

| Platform | Credential | Location | Status |
|----------|-----------|----------|--------|
| Google Ads | Developer Token | .env.local | Test mode |
| Google Ads | Customer ID | .env.local + user profile | `802-958-0768` |
| Google Ads | Refresh Token | OAuth | Per-user via `/api/auth/google-ads/connect` |
| Meta Ads | App ID | .env.local | `META_APP_ID=1706325400803513` (chatRealty, brand-approved, **Live mode**) |
| Meta Ads | App Secret | .env.local | `META_APP_SECRET` |
| Meta Ads | System User Token | .env.local | `META_ADS_ACCESS_TOKEN` — non-expiring, owned by Conversions API System User. **Used for write ops** (image upload, ad creative) since user OAuth tokens hit `(#3) capability` walls until app gets Advanced Access. |
| Meta Ads | Ad Account ID | .env.local + user profile | `act_160011552` |
| Meta Ads | Page ID | .env.local + user profile | `109387773924627` |
| Meta Ads | Pixel ID | .env.local | `NEXT_PUBLIC_META_PIXEL_ID=1378421466770456` |
| Meta Ads | User OAuth Token | User.adAccounts.meta.accessToken | Stored per-agent via `/api/auth/meta-ads/connect` flow. ~60-day expiry. **Used for read ops + ad account/page identification**, not for write ops. |
| Thanks.io | API Key | .env.local | Working (Paid Plan) |
| Thanks.io | Test Mode | .env.local | `true` |

---

## Multi-Tenant Token Strategy

**Current hybrid (May 2026):**

1. OAuth flow stores agent's per-user creds in `User.adAccounts.meta` (long-lived user token + ad account ID + page ID).
2. `launch-ads/route.ts` calls `runWithMetaCreds({ adAccountId, pageId, ... })` with the agent's selections.
3. **Inside that block**, `getConfig()` priority: explicit param → ALS store → env vars.
4. For writes (ad creative, image upload), `launch-ads` deliberately passes `accessToken: undefined` so the env `META_ADS_ACCESS_TOKEN` (system user, full Marketing API capabilities) is used while still operating on the agent's selected ad account.

**Why hybrid:** Without Meta's Advanced Access approval on `ads_management`, OAuth user tokens are limited (can list things, can't always create ad creatives / upload images). System user tokens carry the right capabilities. For multi-tenant scaling, the chatRealty system user needs to be added as a Partner on each agent's ad account.

See `docs/multi-tenant/advertising/campaign-multi-tenant.md` for the 5-phase rollout plan.

---

## CommunityAdWizard Flow

```
Step 1: SELECT PAGE
  ├─ Unified search (community pages, landing pages, blog posts)
  ├─ Community (drill-down: Region → County → City → Subdivision)
  │   └─ Buy / Sell / Community page-variant toggle (lives in selected-page summary)
  ├─ Landing Page (preloaded, filterable)
  ├─ Blog Post (preloaded, filterable)
  └─ Custom URL

Step 2: AUDIENCE  (each channel has its own enable toggle)
  ├─ Meta Retargeting (toggleable)
  │   └─ Multi-select: Website Visitors (Pixel) / CRM Contacts
  ├─ Google PPC (toggleable)
  │   └─ PinDropMap with radius (1-50 mi)
  └─ YouTube Video Ads (toggleable)
      └─ Multi-select: Cold Reach / Website Visitors / YouTube Channel Viewers
      └─ Independent radius pin

Step 3: CONFIGURE
  ├─ Google PPC: Keywords, headlines (≤30 chars × 3+), descriptions (≤90 chars × 2+), $ budget
  ├─ Meta Retargeting: Creative upload, primary text, headline, placements, $ budget
  │   └─ Schedule: Continuous OR Date Range (shadcn calendar)
  └─ YouTube: (not yet implemented end-to-end on launch route)

Step 4: REVIEW & LAUNCH
  ├─ Show $/day prominent, credits/day secondary; full totals if scheduled
  ├─ Save as Draft → /api/campaigns/[id]/save-ads
  └─ Launch → /api/campaigns/[id]/launch-ads
      ├─ Credit balance check
      ├─ For Meta: resolveAudienceIdsForLaunch (existing CA preferred, falls back to ENGAGEMENT/IG audiences if no WEBSITE)
      ├─ runWithMetaCreds → image_hash upload → Campaign (with is_adset_budget_sharing_enabled:false) → AdSet → Creative → Ad
      └─ Persist AdCampaignRecord, flip campaign.activeStrategies.metaAds = true
```

---

## Manage Tab (New)

Replaces the implicit single-campaign view in Analytics. Each parent campaign now has a Manage tab showing **every Meta campaign** in the connected ad account whose name starts with the parent's neighborhood/page name.

**Card per row:**
- Campaign name + Meta campaign ID
- `ORPHAN` badge if Meta has it but our DB doesn't (left over from failed launches)
- Status pill (ACTIVE / PAUSED / DELETED / IN_DRAFT / ...)
- Budget ($/day or lifetime)
- Created date
- Actions: **Pause/Resume**, **Extend** (date picker → updates `end_time` on all ad sets), **Open** (deep link to Meta Ads Manager), **Delete** (cascades on Meta + cleans DB)

**Header actions:**
- `Refresh` button
- `Delete N orphans` button — bulk-deletes all flagged orphans with a progress bar

---

## What Works End-to-End

- ✅ Create campaign with contacts + strategy selection
- ✅ Voicemail pipeline (simple + full mode)
- ✅ Direct mail design → preview → send (test mode)
- ✅ Community page drill-down + unified search
- ✅ Auto-generate keywords + ad copy from page
- ✅ PinDropMap geo targeting (right-click to pin)
- ✅ Image/video upload to Cloudinary for ad creative
- ✅ Save ad config as draft
- ✅ Launch route calls Google + Meta APIs
- ✅ **Meta ad launched + visible in Ads Manager** (verified May 11, 2026)
- ✅ Meta Business OAuth flow (Connect button in Integrations settings)
- ✅ Custom Audience resolution (existing CA or auto-create from Pixel)
- ✅ Manage tab — list/pause/resume/extend/delete + bulk orphan cleanup
- ✅ Facebook Login (for general users) via NextAuth
- ✅ Data deletion compliance page at `/data-deletion`

---

## What's Pending

- ⏳ Google Ads OAuth + Developer Token review (Basic Access submitted)
- ⏳ Meta `ads_management` **Advanced Access** review — would let us drop the system-user-token fallback and rely purely on OAuth user tokens for write ops
- ⏳ YouTube Video campaigns on the launch route (UI done in wizard; backend not yet wired)
- ⏳ Reserve-at-launch credit debiting (Phase 3 of multi-tenant plan)
- ⏳ Nightly Meta `/insights` settle cron (Phase 4)
- ⏳ "Add ChatRealty as Partner" agent onboarding step (Phase 5)
- ⏳ AI-driven chat suggestion chips (proposed, not yet built)
- ⏳ 3 unused wizard files to delete (Google/Meta/Digital standalone)

---

## Pricing (Thanks.io Paid Plan)

| Type | Price |
|------|-------|
| Postcard 4x6 | $0.65 |
| Postcard 6x9 | $0.72 |
| Postcard 6x11 | $0.93 |
| Windowed Letter | $0.96 |
| Windowless Letter | $1.16 |
| Notecard | $1.66 |
| Radius lookup | $0.05/address |
| Data append | $0.20/address |

(Translated to credits via `creditsForOperation('direct_mail', ...)` in `src/lib/credits.ts`.)
