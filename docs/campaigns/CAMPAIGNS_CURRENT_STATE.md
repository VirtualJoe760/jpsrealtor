# Campaign System — Current State Reference

> Last Updated: 2026-04-22 | Branch: feat/campaign-system-multi-channel

---

## What Exists

### 3 Strategy Cards (Campaign Detail Panel)

| Card | Wizard | Status |
|------|--------|--------|
| **Voice Mails** | `CampaignPipelineWizard` | Working — Drop Cowboy + 11Labs |
| **Direct Mail** | `DirectMailPipelineWizard` | Working — thanks.io API wired |
| **Community Ads** | `CommunityAdWizard` | Working — Google PPC + Meta retargeting |

### Create New Campaign Flow

5-step wizard: Type → Details → Strategies → Contacts → Review

- Strategy step shows 3 toggleable cards: Voice Mails, Direct Mail, Community Ads
- Contacts step has tag-based quick-select
- Creates campaign in MongoDB with `activeStrategies` flags

---

## Files

### Models

| File | Purpose |
|------|---------|
| `src/models/Campaign.ts` | Main campaign model — strategies, configs, stats |
| `src/models/DirectMailPiece.ts` | Individual mail piece tracking |
| `src/models/AdCampaignRecord.ts` | Ad campaign performance snapshots |
| `src/models/ContactCampaign.ts` | Junction: contacts ↔ campaigns |
| `src/models/VoicemailScript.ts` | Per-contact voicemail scripts |
| `src/models/CampaignExecution.ts` | Execution history |

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
| `/api/campaigns/[id]/history` | GET | Execution history |
| `/api/campaigns/[id]/recordings/list` | GET | Drop Cowboy recordings |
| `/api/agent/ad-accounts` | GET/POST/DELETE | Ad platform credentials |
| `/api/auth/google-ads/connect` | GET | Google OAuth initiation |
| `/api/auth/google-ads/callback` | GET | Google OAuth callback |
| `/api/neighborhoods/reference` | GET | Lightweight hierarchy for page selector |
| `/api/thanksio/webhook` | POST | Delivery/scan event handler |

### Frontend Components

| File | Purpose |
|------|---------|
| **Pages** | |
| `src/app/agent/campaigns/page.tsx` | Campaign list (grid/list view) |
| `src/app/agent/campaigns/new/page.tsx` | Create campaign wizard |
| **Campaign Detail** | |
| `src/app/components/campaigns/CampaignCard.tsx` | Campaign card (grid/list) |
| `src/app/components/campaigns/CampaignDetailPanel.tsx` | Right-side detail panel |
| `src/app/components/campaigns/CampaignOverview.tsx` | Strategy cards + wizard routing |
| `src/app/components/campaigns/ContactSelector.tsx` | Contact selection with tag pills |
| `src/app/components/campaigns/AdAccountsSetup.tsx` | Google/Meta account connection UI |
| `src/app/components/campaigns/PinDropMap.tsx` | Leaflet map for geo targeting |
| **Pipeline Wizards** | |
| `pipeline/CampaignPipelineWizard.tsx` | Voicemail wizard (simple + full mode) |
| `pipeline/DirectMailPipelineWizard.tsx` | Direct mail wizard |
| `pipeline/CommunityAdWizard.tsx` | Google PPC + Meta retargeting wizard |
| `pipeline/PipelineStepIndicator.tsx` | Dynamic step indicator (accepts any steps) |
| `pipeline/PipelineContactsStep.tsx` | Shared contacts step |
| `pipeline/PipelineScriptsStep.tsx` | Voicemail script generation |
| `pipeline/PipelineReviewStep.tsx` | Script review/edit |
| `pipeline/PipelineAudioStep.tsx` | Audio generation (full mode) |
| `pipeline/PipelineAudioSimpleStep.tsx` | Audio selection (simple mode) |
| `pipeline/PipelineSendStep.tsx` | Voicemail send (full) |
| `pipeline/PipelineSendSimpleStep.tsx` | Voicemail send (simple) |
| **Unused (can delete)** | |
| `pipeline/DigitalAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |
| `pipeline/GoogleAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |
| `pipeline/MetaAdsPipelineWizard.tsx` | Replaced by CommunityAdWizard |

### API Clients (src/lib/)

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/google-ads-api.ts` | Google Ads REST API v18 | Ready — needs refresh token |
| `src/lib/meta-ads-api.ts` | Meta Marketing API v21 | Ready — token working |
| `src/lib/thanksio.ts` | Thanks.io direct mail API | Ready — API key working |

### Documentation

| File | Content |
|------|---------|
| `docs/campaigns/CAMPAIGN_SYSTEM_VISION.md` | Original architecture vision |
| `docs/campaigns/AD_PLATFORMS_OPTIONS.md` | Google + Meta platform capabilities |
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
    voicemail, email, text,      // legacy
    directMail, googleAds, metaAds  // new
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
    sent, delivered, listened, failed,           // voicemail
    mailSent, mailDelivered, qrScans,            // direct mail
    adImpressions, adClicks, adConversions, adSpend  // digital ads
  },

  // Status flow
  status: draft → importing_contacts → generating_scripts → generating_audio → review → approved → submitted → active → completed
}
```

---

## Credentials Status

| Platform | Credential | Location | Status |
|----------|-----------|----------|--------|
| Google Ads | Developer Token | .env.local + user profile | `xUFCAy67JFPOlsaUj5MSzA` (Test mode) |
| Google Ads | Customer ID | .env.local + user profile | `802-958-0768` |
| Google Ads | Manager ID | .env.local | `206-304-7113` |
| Google Ads | Refresh Token | Not yet | Need OAuth flow |
| Meta Ads | Ad Account ID | .env.local + user profile | `act_160011552` (verified working) |
| Meta Ads | Page ID | .env.local + user profile | `109387773924627` |
| Meta Ads | Access Token | .env.local + user profile | 60-day token (expires ~June 21) |
| Thanks.io | API Key | .env.local | Working (Paid Plan) |
| Thanks.io | Test Mode | .env.local | `true` (auto-cancels orders) |

---

## CommunityAdWizard Flow

```
Step 1: SELECT PAGE
  ├─ Community (drill-down: Region → County → City → Subdivision)
  │   └─ Buy Page / Sell Page / Community Page toggle
  ├─ Landing Page (searchable list)
  ├─ Blog Post (searchable list)
  └─ Custom URL

Step 2: AUDIENCE
  ├─ Meta: Website Visitors (Pixel) or CRM Contacts
  └─ Google: PinDropMap with radius (1-50mi)

Step 3: CONFIGURE
  ├─ Google PPC (toggleable)
  │   ├─ Keywords (auto-generated, editable, add/remove)
  │   ├─ Headlines (max 30 chars × 3+)
  │   ├─ Descriptions (max 90 chars × 2+)
  │   └─ Daily budget
  └─ Meta Retargeting (toggleable)
      ├─ Creative upload (image/video → Cloudinary)
      ├─ Primary text + headline
      ├─ Placements (FB Feed, IG Feed, Stories, Reels)
      └─ Daily budget

Step 4: REVIEW & LAUNCH
  ├─ Save as Draft → /api/campaigns/[id]/save-ads
  └─ Launch → /api/campaigns/[id]/launch-ads
      ├─ Google: Budget → Campaign → AdGroup → Keywords → RSA (all PAUSED)
      └─ Meta: Campaign → AdSet → Creative → Ad (all PAUSED, Housing SAC)
```

---

## DirectMailPipelineWizard Flow

```
Step 1: CONTACTS
  ├─ ☑ Campaign Contacts (existing)
  └─ ☑ Radius Send (can enable both)
      ├─ Address + ZIP code
      ├─ Record count slider (50-2000)
      ├─ Audience filter (All / Likely to Move / Absentee Owners / High Net Worth)
      └─ PinDropMap

Step 2: DESIGN
  ├─ Mail type: Postcard 4x6 ($0.65), 6x9 ($0.72), 6x11 ($0.93), Letter ($0.96), Notecard ($1.66)
  ├─ Front image URL
  ├─ Back image URL (postcards)
  ├─ Message (handwritten for notecards)
  ├─ QR code URL
  └─ Return address

Step 3: PREVIEW
  └─ Cost estimate, front/back preview, message preview

Step 4: SEND
  └─ POST /api/campaigns/[id]/send-mail → thanks.io API
```

---

## What Works End-to-End

- ✅ Create campaign with contacts + strategy selection
- ✅ Voicemail pipeline (simple + full mode)
- ✅ Direct mail design → preview → send (test mode)
- ✅ Community page drill-down (Region → City → Subdivision)
- ✅ Auto-generate keywords + ad copy from page
- ✅ PinDropMap geo targeting (right-click to pin)
- ✅ Image/video upload to Cloudinary for ad creative
- ✅ Save ad config as draft
- ✅ Launch route calls Google + Meta APIs
- ✅ Meta API verified working (ad account responds)
- ✅ Tag-based contact quick-select
- ✅ Buy/Sell/Community page variant toggle

## GBP Integration (April 2026)

GBP auto-posting is now integrated into the article publishing pipeline. When an article is published (not draft) via `POST /api/articles/publish`, the pipeline automatically creates a corresponding Google Business Profile post with the article title, excerpt, featured image, and a "Learn More" CTA linking back to the article. GBP posting is non-blocking -- if it fails, the article still publishes normally.

GBP is now **per-user via OAuth**. Each agent can connect their own GBP account through the OAuth flow at `/api/auth/gbp/connect`. On connect, the system auto-discovers the agent's GBP account and location IDs. Per-user credentials are stored in `User.adAccounts.gbp` (refreshToken, accountId, locationId). The platform owner's env var credentials serve as a fallback when no user-specific GBP is connected.

See `docs/chatrealty/GBP_AUTO_POSTING.md` and `docs/chatrealty/GBP_PER_USER.md` for full details.

---

## What's Pending

- ⏳ Google Ads refresh token (need OAuth flow)
- ⏳ Google Ads Basic Access approval (submitted, 2-7 days)
- ⏳ Meta system user permanent token (using 60-day user token)
- ⏳ Ad performance dashboard (pull metrics back from platforms)
- ⏳ AdAccountsSetup component not yet added to settings page
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
