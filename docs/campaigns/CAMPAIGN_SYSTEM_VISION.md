# Campaign System Vision: Ad Campaigns + Direct Mail

> Created: 2026-04-13 | Status: Planning

---

## Executive Summary

Transform the existing campaigns system from voicemail/SMS/email-only into a full marketing automation hub that supports:

1. **Digital Ad Campaigns** — Create and manage Google Ads + Meta (Facebook/Instagram) ad campaigns directly from the agent dashboard, using contacts, landing pages, and neighborhood data
2. **Direct Mail** — Send postcards, letters, and handwritten notes via thanks.io API, integrated with our CRM contacts
3. **AI-Powered Campaign Creation** — Use the Groq AI chat in the dashboard to create and execute campaigns via natural language
4. **Voicemails** — Keep existing Drop Cowboy voicemail functionality

The system replaces the current **Text Messages** and **Email Campaigns** strategy cards with **Direct Mail** and **Landing Page / Digital Ads**.

---

## Current Architecture

### What Exists Today

**Campaign Model** (`src/models/Campaign.ts`):
- Types: `sphere_of_influence`, `past_clients`, `neighborhood_expireds`, `high_equity`, `custom`
- Strategies: `voicemail`, `email`, `text` (booleans in `activeStrategies`)
- Status flow: `draft` → `importing_contacts` → `generating_scripts` → `generating_audio` → `review` → `approved` → `submitted` → `active` → `completed`
- Stats tracking: totalContacts, scriptsGenerated, audioGenerated, sent, delivered, listened, failed
- Drop Cowboy config for voicemail delivery

**Supporting Models**:
- `ContactCampaign` — junction table linking contacts to campaigns with status tracking
- `VoicemailScript` — per-contact scripts with audio generation (11Labs) and delivery tracking (Drop Cowboy)
- `CampaignExecution` — historical execution records with strategy-specific metrics
- `SMSMessage` — Twilio SMS message history

**API Routes** (under `src/app/api/campaigns/`):
- `create/` — Create campaign with contacts
- `list/` — List all campaigns with analytics
- `[id]/` — Delete campaign
- `[id]/contacts/` — Add/remove contacts
- `[id]/generate-scripts/` — AI script generation
- `[id]/generate-audio/` — 11Labs audio synthesis
- `[id]/send/` — Full pipeline voicemail send via Drop Cowboy
- `[id]/send-simple/` — Pre-recorded voicemail send
- `[id]/scripts/` — Script management
- `[id]/history/` — Execution history
- `[id]/recordings/list` — Drop Cowboy recordings

**Frontend** (under `src/app/agent/campaigns/`):
- Campaign list page with grid/list view, status filters, search
- New campaign wizard (5-step)
- Campaign detail panel with tabs: Overview, Contacts, History, Analytics
- Strategy cards: Voice Mails, Text Messages, Email Campaigns
- Pipeline wizard for script → audio → send workflow

**Landing Pages** (`src/app/lp/[slug]/`):
- CMS-driven MDX landing pages
- Optional lead capture forms
- Form submissions create users + fire Meta CAPI events
- Agent profile integration

---

## New Architecture

### Strategy Cards Replacement

| Current | New | Integration |
|---|---|---|
| Voice Mails | **Voice Mails** (keep) | Drop Cowboy + 11Labs |
| Text Messages | **Direct Mail** (replace) | thanks.io API |
| Email Campaigns | **Digital Ads** (replace) | Google Ads API + Meta Marketing API |

### New Campaign Types

Add to existing types:
- `direct_mail` — Postcard/letter campaigns via thanks.io
- `digital_ads` — Google Ads + Meta ads targeting neighborhoods/audiences
- `multi_channel` — Combines voicemail + direct mail + digital ads

---

## Integration Details

### 1. Direct Mail (thanks.io)

**API**: `https://api.thanks.io/api/v2/`
**Auth**: Bearer token (stored as `THANKSIO_API_KEY` in env)
**Pricing**: $0.99/postcard (4x6), $1.59/postcard (6x9), $1.99/letter, $2.79/notecard — includes postage

**Mail Types**:
| Type | Endpoint | Use Case |
|---|---|---|
| Postcard (4x6) | `POST /send/postcard` | Just listed/sold, farming, market updates |
| Postcard (6x9) | `POST /send/postcard` | CMA reports, neighborhood highlights |
| Letter | `POST /send/letter` | Detailed CMA, personalized outreach |
| Notecard | `POST /send/notecard` | Handwritten follow-ups, thank you notes |

**Key Features**:
- Handwriting simulation (proprietary — each glyph varies)
- QR code tracking per recipient (scan notifications)
- Delivery webhooks for status tracking
- `custom1-4` fields for mail merge (property address, price, agent branding)
- Radius search sending (send to all addresses within X miles)
- Batch sending (array of recipients per API call)
- Testing mode (auto-cancels orders for development)
- Mailing list management with drip campaign automation

**Data Flow**:
```
CRM Contacts → Select recipients → Design template →
  → POST /send/postcard with recipient array
  → thanks.io prints + mails
  → QR scan webhook → update CampaignExecution metrics
  → Delivery webhook → update contact activity
```

**New Files Needed**:
- `src/lib/thanksio.ts` — API client (send postcard, send letter, list handwriting styles, track delivery)
- `src/app/api/campaigns/[id]/send-mail/route.ts` — Direct mail execution endpoint
- `src/app/api/thanksio/webhook/route.ts` — Delivery/scan webhook handler
- `src/app/components/campaigns/DirectMailDesigner.tsx` — Template designer component
- `src/app/components/campaigns/DirectMailPreview.tsx` — Preview before sending

### 2. Digital Ads (Google Ads API + Meta Marketing API)

#### Google Ads API

**Auth Requirements**:
- Developer token (apply at Google Ads API Center)
- OAuth 2.0 credentials (Google Cloud project)
- Customer ID: `472-551-901`
- Google Tag already installed: `GT-MKB7FKDR`

**Capabilities**:
- Create Search, Display, Performance Max campaigns programmatically
- Geo-target by ZIP code or radius around lat/lng (neighborhood targeting)
- Upload customer match lists (hashed email/phone from CRM)
- Set budgets and bid strategies (maximize conversions, target CPA)
- Create responsive search ads and display ads
- Link landing pages via `final_urls` field on ads

**Campaign Creation Flow**:
```
Select contacts/audience → Choose neighborhood targeting →
  → Select/create landing page → Set budget + schedule →
  → API creates: Campaign → AdGroup → Ad → GeoTargeting →
  → Campaign goes live → Conversion events flow back via gtag
```

**Approval Process**: Apply for Basic Access developer token (2-7 business days). Test in sandbox first.

#### Meta Marketing API

**Auth Requirements**:
- Facebook App (JPSREALTOR, ID: `3698458803622960`)
- System User token (already have Conversions API System User)
- Need `ads_management` permission (requires App Review, ~5+ business days)
- Ad Account needed (create in Meta Business Suite)

**Capabilities**:
- Create campaigns with objectives: OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS
- Geo-target by ZIP or radius around lat/lng
- Custom Audiences from CRM contacts (hashed email/phone upload)
- Lookalike Audiences from best customers
- Create image/video/carousel ads
- Lead Forms (in-app forms syncing to CRM)
- Link landing pages via `link` field on creative

**Campaign Creation Flow**:
```
Select contacts/audience → Choose neighborhood targeting →
  → Select/create landing page → Upload creative (photo/video) →
  → Set budget + schedule → Choose placements (Facebook, Instagram, Stories) →
  → API creates: Campaign → AdSet → AdCreative → Ad →
  → Campaign goes live → Pixel/CAPI events flow back
```

**New Files Needed**:
- `src/lib/google-ads-api.ts` — Google Ads API client (create campaign, ad group, ads, targeting)
- `src/lib/meta-ads-api.ts` — Meta Marketing API client (create campaign, ad set, creative, ads)
- `src/app/api/campaigns/[id]/launch-ads/route.ts` — Digital ad campaign launch endpoint
- `src/app/api/campaigns/[id]/ads-performance/route.ts` — Pull ad performance metrics
- `src/app/api/audiences/sync/route.ts` — Sync CRM contacts to Google/Meta custom audiences
- `src/app/components/campaigns/AdCampaignBuilder.tsx` — Ad campaign configuration UI
- `src/app/components/campaigns/AdPreview.tsx` — Ad creative preview
- `src/app/components/campaigns/AudienceBuilder.tsx` — Audience targeting UI

### 3. AI-Powered Campaign Chat

**Vision**: The agent dashboard chat (Groq AI) can understand commands like:
- "Create a farming campaign for PGA West with postcards and Instagram ads"
- "Send a just-listed postcard to all contacts in La Quinta"
- "Launch a Google Search ad for my new listing at 123 Main St"
- "Show me how my PGA West campaign is performing"

**Implementation**:
- Add campaign tool functions to the chat tool executor system (`src/lib/chat-v2/tool-executors.ts`)
- New tools: `createCampaign`, `sendDirectMail`, `launchAds`, `getCampaignPerformance`, `buildAudience`
- AI generates campaign parameters, user confirms before execution
- Integrates with existing chat-v2 architecture

**New Files Needed**:
- `src/lib/chat-v2/campaign-tools.ts` — Campaign tool definitions for Groq
- `src/lib/chat-v2/campaign-executor.ts` — Execute campaign actions from chat

---

## Database Schema Changes

### Campaign Model Updates

```typescript
// Add to activeStrategies
activeStrategies: {
  voicemail: boolean,
  email: boolean,     // keep for future
  text: boolean,      // keep for future
  directMail: boolean,  // NEW
  googleAds: boolean,   // NEW
  metaAds: boolean,     // NEW
}

// Add new config objects
thanksioConfig?: {
  mailType: 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter' | 'notecard',
  frontImageUrl?: string,
  backImageUrl?: string,
  message?: string,
  handwritingStyle?: number,
  qrUrl?: string,
  returnAddress?: { name, address, city, state, zip },
  templateId?: string,  // saved template
}

googleAdsConfig?: {
  campaignId?: string,        // Google Ads campaign ID once created
  adGroupId?: string,
  budget: number,             // daily budget in dollars
  bidStrategy: 'maximize_conversions' | 'maximize_clicks' | 'target_cpa',
  targetCpa?: number,
  geoTargeting: {
    type: 'radius' | 'zip' | 'city',
    center?: { lat: number, lng: number },
    radiusMiles?: number,
    zipCodes?: string[],
    cityIds?: number[],
  },
  landingPageUrl: string,     // /lp/{slug} URL
  adType: 'search' | 'display' | 'performance_max',
  headlines?: string[],       // up to 15 for RSA
  descriptions?: string[],   // up to 4 for RSA
  imageUrls?: string[],      // for display ads
  startDate?: Date,
  endDate?: Date,
}

metaAdsConfig?: {
  campaignId?: string,        // Meta campaign ID once created
  adSetId?: string,
  adId?: string,
  objective: 'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS',
  budget: number,             // daily budget
  geoTargeting: {
    type: 'radius' | 'zip',
    center?: { lat: number, lng: number },
    radiusMiles?: number,
    zipCodes?: string[],
  },
  placements: ('facebook_feed' | 'instagram_feed' | 'instagram_stories' | 'instagram_reels' | 'audience_network')[],
  landingPageUrl: string,
  headline?: string,
  primaryText?: string,
  description?: string,
  imageUrl?: string,
  videoUrl?: string,
  callToAction: 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US',
  customAudienceId?: string,  // uploaded CRM audience
  lookalikeAudienceId?: string,
  startDate?: Date,
  endDate?: Date,
}

// Add to stats
stats: {
  // existing...
  mailSent: number,           // NEW
  mailDelivered: number,      // NEW
  qrScans: number,            // NEW
  adImpressions: number,      // NEW
  adClicks: number,           // NEW
  adConversions: number,      // NEW
  adSpend: number,            // NEW
}
```

### New Model: DirectMailPiece

```typescript
// Track individual mail pieces (similar to VoicemailScript)
{
  campaignId: ObjectId,
  contactId: ObjectId,
  userId: ObjectId,

  mailType: 'postcard_4x6' | 'postcard_6x9' | 'letter' | 'notecard',
  thanksioOrderId?: string,

  // Content
  frontImageUrl: string,
  backImageUrl?: string,
  message: string,

  // Recipient
  recipientName: string,
  recipientAddress: { street, city, state, zip },

  // Status
  status: 'pending' | 'submitted' | 'printing' | 'mailed' | 'delivered' | 'returned',
  submittedAt?: Date,
  mailedAt?: Date,
  deliveredAt?: Date,

  // QR Tracking
  qrUrl?: string,
  qrScannedAt?: Date,

  // Cost
  cost: number,

  createdAt: Date,
  updatedAt: Date,
}
```

### New Model: AdCampaignRecord

```typescript
// Track ad campaign performance snapshots
{
  campaignId: ObjectId,
  userId: ObjectId,
  platform: 'google' | 'meta',

  // Platform IDs
  externalCampaignId: string,
  externalAdGroupId?: string,
  externalAdId?: string,

  // Performance (updated periodically)
  metrics: {
    impressions: number,
    clicks: number,
    conversions: number,
    spend: number,
    ctr: number,
    cpc: number,
    cpa: number,
  },

  // Status
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected',

  // Snapshot date
  snapshotDate: Date,

  createdAt: Date,
  updatedAt: Date,
}
```

---

## Environment Variables Needed

```env
# Thanks.io (Direct Mail)
THANKSIO_API_KEY=<bearer token from dashboard.thanks.io>
THANKSIO_TEST_MODE=true  # set false for production

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=<from API Center>
GOOGLE_ADS_CLIENT_ID=<OAuth client ID>
GOOGLE_ADS_CLIENT_SECRET=<OAuth client secret>
GOOGLE_ADS_REFRESH_TOKEN=<OAuth refresh token>
GOOGLE_ADS_CUSTOMER_ID=4725519010  # no dashes
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<MCC ID if using manager account>

# Meta Marketing API
META_ADS_ACCESS_TOKEN=<system user token with ads_management>
META_AD_ACCOUNT_ID=<act_XXXXXXXXX>
```

---

## Frontend Changes

### Campaign Overview Strategy Cards

Replace current 3 cards with 4:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Voice Mails   │ │   Direct Mail   │ │  Google Ads     │ │   Meta Ads      │
│                 │ │                 │ │                 │ │                 │
│ Create scripts, │ │ Send postcards, │ │ Search & display│ │ Facebook &      │
│ generate AI     │ │ letters, notes  │ │ ads targeting   │ │ Instagram ads   │
│ voiceovers,     │ │ via thanks.io   │ │ neighborhoods   │ │ with custom     │
│ send via Drop   │ │ with QR         │ │ and audiences   │ │ audiences       │
│ Cowboy          │ │ tracking        │ │                 │ │                 │
│                 │ │                 │ │                 │ │                 │
│ sent: 0         │ │ mailed: 0       │ │ clicks: 0       │ │ clicks: 0       │
│ listened: 0     │ │ scanned: 0      │ │ conversions: 0  │ │ conversions: 0  │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### New Campaign Wizard Updates

Step 4 (Select Communication Strategies) adds:
- Direct Mail — checkbox + mail type selector (postcard, letter, notecard)
- Google Ads — checkbox + budget + targeting preview
- Meta Ads — checkbox + budget + placement selector

### New Components

| Component | Purpose |
|---|---|
| `DirectMailDesigner.tsx` | Design postcard/letter with image upload, message, QR code |
| `DirectMailPreview.tsx` | Preview front/back of mail piece before sending |
| `AdCampaignBuilder.tsx` | Configure ad campaign: budget, targeting, creative, schedule |
| `AdPreview.tsx` | Preview how ad will look on Google/Meta |
| `AudienceBuilder.tsx` | Build audience from contacts, labels, or neighborhoods |
| `NeighborhoodTargetingMap.tsx` | Visual map for selecting geo-targeting radius |
| `CampaignBudgetCalculator.tsx` | Estimate costs (mail pieces + ad spend) |
| `LandingPageSelector.tsx` | Pick or create a landing page for the campaign |

---

## Implementation To-Do List

### Phase 1: Foundation (Week 1-2)

- [ ] **Database Schema Updates**
  - [ ] Update Campaign model — Add `directMail`, `googleAds`, `metaAds` to `activeStrategies`
  - [ ] Add `thanksioConfig`, `googleAdsConfig`, `metaAdsConfig` config objects to Campaign
  - [ ] Add new stats fields: `mailSent`, `mailDelivered`, `qrScans`, `adImpressions`, `adClicks`, `adConversions`, `adSpend`
  - [ ] Create DirectMailPiece model — Track individual mail pieces with status, cost, QR tracking
  - [ ] Create AdCampaignRecord model — Track ad campaign performance snapshots per platform
- [ ] **Thanks.io Setup**
  - [ ] Create thanks.io account — Sign up, enable test mode
  - [ ] Add `THANKSIO_API_KEY` to .env.local and Vercel
  - [ ] Create `src/lib/thanksio.ts` — API client (auth, send postcard/letter/notecard, list handwriting styles, track delivery)
  - [ ] Create `src/app/api/thanksio/webhook/route.ts` — Webhook handler for delivery/QR scan events
- [ ] **Frontend Strategy Card Swap**
  - [ ] Update CampaignOverview.tsx — Replace Text Messages card with Direct Mail card
  - [ ] Update CampaignOverview.tsx — Replace Email Campaigns card with Digital Ads card (Google + Meta)

### Phase 2: Direct Mail Integration (Week 2-3)

- [ ] **Mail Designer & Preview**
  - [ ] Create `DirectMailDesigner.tsx` — Image upload (front/back), message editor with merge variables, handwriting style picker, QR code URL
  - [ ] Create `DirectMailPreview.tsx` — Front/back preview with recipient data populated
  - [ ] Create postcard templates — Just Listed, Just Sold, CMA Report, Market Update, Open House Invite, Neighborhood Farming
- [ ] **Send Pipeline**
  - [ ] Create `src/app/api/campaigns/[id]/send-mail/route.ts` — Fetch contacts, format addresses, batch send via thanks.io, create DirectMailPiece records, update campaign stats
  - [ ] Add direct mail to CampaignPipelineWizard — New flow: Design template → Preview → Confirm cost → Send
- [ ] **Tracking & Analytics**
  - [ ] Wire thanks.io webhook — Update DirectMailPiece status on delivery events
  - [ ] Add direct mail metrics to CampaignDetailPanel — Show mailed, delivered, QR scans in Analytics tab
  - [ ] Update campaign stats on QR scan webhook events

### Phase 3: Google Ads API Integration (Week 3-5)

- [ ] **Account & Auth Setup**
  - [ ] Apply for Google Ads API developer token — Google Ads > Tools > API Center, Basic Access (2-7 business days)
  - [ ] Create Google Cloud project, enable Google Ads API
  - [ ] Set up OAuth 2.0 credentials, generate refresh token
  - [ ] Add `GOOGLE_ADS_*` env vars to .env.local and Vercel
- [ ] **API Client & Endpoints**
  - [ ] Create `src/lib/google-ads-api.ts` — Create campaign, ad group, responsive search ad, display ad, set geo-targeting, set budget, get performance metrics
  - [ ] Create `src/app/api/campaigns/[id]/launch-ads/route.ts` — Build full campaign: Budget → Campaign → AdGroup → Ad → GeoTargeting → CustomerMatch
  - [ ] Create `src/app/api/campaigns/[id]/ads-performance/route.ts` — Pull metrics from Google Ads API, update AdCampaignRecord
- [ ] **Audience Management**
  - [ ] Create `src/app/api/audiences/sync/route.ts` — Hash contact emails/phones, upload to Google Ads as customer match list
  - [ ] Create `AudienceBuilder.tsx` — UI to select contacts by label/tag/city → upload as Customer Match list
- [ ] **Campaign Builder UI**
  - [ ] Create `AdCampaignBuilder.tsx` — Select ad type (search/display), write headlines/descriptions, set budget, choose targeting, select landing page
  - [ ] Create `NeighborhoodTargetingMap.tsx` — Interactive map for setting geo-targeting radius around subdivisions/neighborhoods
  - [ ] Create `LandingPageSelector.tsx` — Pick existing landing page or create new one for the campaign

### Phase 4: Meta Ads API Integration (Week 5-7)

- [ ] **Account & Auth Setup**
  - [ ] Request `ads_management` permission — Submit App Review on JPSREALTOR Facebook App (5+ business days)
  - [ ] Create Meta Ad Account in Business Suite (if not existing)
  - [ ] Generate system user token with `ads_management` — Business Settings > System Users
  - [ ] Add `META_ADS_*` env vars to .env.local and Vercel
- [ ] **API Client**
  - [ ] Create `src/lib/meta-ads-api.ts` — Create campaign, ad set, ad creative, ad, upload images/videos, manage custom/lookalike audiences, get performance metrics
- [ ] **Extend Existing Endpoints**
  - [ ] Extend `launch-ads` route — Add Meta campaign creation alongside Google Ads
  - [ ] Extend `ads-performance` route — Pull Meta Ads metrics into AdCampaignRecord
  - [ ] Extend `audiences/sync` route — Upload customer match to Meta Custom Audiences
- [ ] **Meta-Specific UI**
  - [ ] Add Meta fields to AdCampaignBuilder — Placements (Facebook feed, Instagram feed, Stories, Reels), objective, creative format (image/video/carousel)
  - [ ] Create `AdPreview.tsx` — Show how ad will appear on Facebook/Instagram

### Phase 5: AI Chat Campaign Integration (Week 7-9)

- [ ] **Tool Definitions & Execution**
  - [ ] Create `src/lib/chat-v2/campaign-tools.ts` — Tool schemas for Groq: `createCampaign`, `selectContacts`, `designPostcard`, `launchGoogleAds`, `launchMetaAds`, `getCampaignPerformance`, `buildAudience`
  - [ ] Create `src/lib/chat-v2/campaign-executor.ts` — Execute campaign actions from AI tool calls with confirmation step before spending
  - [ ] Register campaign tools in `src/lib/chat-v2/tool-executors.ts`
- [ ] **Context & Prompting**
  - [ ] Add campaign context to AI system prompt — Available campaigns, contact counts, landing pages, neighborhood data
- [ ] **Confirmation UX**
  - [ ] Build confirmation UI — Show confirmation card in chat before executing spending actions (launch ads, send mail)
- [ ] **Validation & Testing**
  - [ ] "Create a farming campaign for PGA West"
  - [ ] "Send just-listed postcards to my La Quinta contacts"
  - [ ] "Launch Instagram ads for my new listing"
  - [ ] "How is my PGA West campaign performing?"

### Phase 6: Polish & Analytics (Week 9-10)

- [ ] **Unified Dashboard**
  - [ ] Unified campaign analytics — Combine voicemail, direct mail, and digital ad metrics in one view
  - [ ] Cost tracking — Per-campaign spend across all channels (thanks.io costs, ad spend)
  - [ ] ROI calculator — Compare campaign cost vs lead value
- [ ] **Campaign Automation**
  - [ ] Campaign templates — Pre-built multi-channel templates (e.g., "New Listing Package" = postcard + Instagram ad + voicemail)
  - [ ] Scheduled campaigns — Cron-based execution for campaigns with future start dates
  - [ ] Campaign cloning — Duplicate successful campaigns with new contacts/neighborhoods
- [ ] **Optimization**
  - [ ] A/B testing — Test different creatives/messages across channels

---

## Architecture Principles

1. **Modular channel adapters** — Each channel (voicemail, direct mail, Google Ads, Meta Ads) is a separate library in `src/lib/` with a consistent interface: `create()`, `send()`, `getMetrics()`, `handleWebhook()`
2. **Campaign model is channel-agnostic** — The Campaign model stores config for all channels but only activates the ones selected. Execution logic lives in the API routes, not the model.
3. **Landing pages are the conversion hub** — Every ad campaign and direct mail piece should link back to a landing page (`/lp/{slug}`) with tracking. This connects ad spend → landing page → lead capture → CRM contact.
4. **Contacts are the audience** — All campaign targeting starts from the contact database. Labels, tags, cities, and subdivisions are the segmentation primitives.
5. **AI chat is the orchestrator** — Long-term, the chat interface should be able to create, configure, and launch any campaign type through natural language, with human confirmation before spending actions.
6. **Everything is trackable** — Every mail piece, ad click, voicemail listen, and form submission flows back to the campaign's analytics with a unified reporting view.

---

## External Account Setup Required

| Service | Action Needed | Timeline |
|---|---|---|
| **thanks.io** | Create account, get API key, enable test mode | Same day |
| **Google Ads API** | Apply for developer token (Basic Access) | 2-7 business days |
| **Meta Ads** | Submit App Review for `ads_management` permission | 5+ business days |
| **Meta Ads** | Create Ad Account in Business Suite | Same day |
| **Google Cloud** | Create project, enable Google Ads API, set up OAuth | Same day |

---

## File Structure (New Files)

```
src/
├── lib/
│   ├── thanksio.ts                    # Thanks.io API client
│   ├── google-ads-api.ts              # Google Ads API client
│   ├── meta-ads-api.ts                # Meta Marketing API client
│   └── chat-v2/
│       ├── campaign-tools.ts          # AI tool definitions for campaigns
│       └── campaign-executor.ts       # Execute campaign actions from chat
├── models/
│   ├── DirectMailPiece.ts             # Individual mail piece tracking
│   └── AdCampaignRecord.ts           # Ad campaign performance snapshots
├── app/
│   ├── api/
│   │   ├── campaigns/[id]/
│   │   │   ├── send-mail/route.ts     # Direct mail execution
│   │   │   ├── launch-ads/route.ts    # Digital ad campaign launch
│   │   │   └── ads-performance/route.ts # Ad performance metrics
│   │   ├── audiences/
│   │   │   └── sync/route.ts          # CRM → Google/Meta audience sync
│   │   └── thanksio/
│   │       └── webhook/route.ts       # Delivery/QR scan webhooks
│   └── components/campaigns/
│       ├── DirectMailDesigner.tsx      # Mail template designer
│       ├── DirectMailPreview.tsx       # Mail piece preview
│       ├── AdCampaignBuilder.tsx       # Ad campaign configuration
│       ├── AdPreview.tsx              # Ad creative preview
│       ├── AudienceBuilder.tsx        # Audience targeting UI
│       ├── NeighborhoodTargetingMap.tsx # Geo-targeting map
│       ├── CampaignBudgetCalculator.tsx # Cost estimation
│       └── LandingPageSelector.tsx    # Landing page picker/creator
```
