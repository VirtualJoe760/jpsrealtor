# Campaign-Strategy Architecture - Centralized Marketing System

> ⚠️ **HISTORICAL** — This is the original architecture vision (early 2026). The system has since shipped and expanded with Meta/Google/YouTube ads, multi-tenant OAuth, and a credits system. For the current state, see **[CAMPAIGNS_CURRENT_STATE.md](./CAMPAIGNS_CURRENT_STATE.md)**.

## Executive Summary

This document outlines the new **Campaign-Strategy** architecture for the agent dashboard, designed to centralize all marketing efforts around **Campaigns** with multiple **Strategies** (text, voicemail drop, email) that can be deployed to assigned **Contacts**.

### Key Principles

1. **Campaigns** are the central organizing unit for all marketing
2. **Contacts** are assigned to campaigns
3. **Strategies** (SMS, Voicemail, Email) are deployed within campaigns
4. **Multi-channel coordination** - All channels tracked in one place
5. **Unified analytics** - Campaign performance across all channels

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT DASHBOARD                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   CRM        │  │  CAMPAIGNS   │  │  ANALYTICS   │     │
│  │  (Contacts)  │  │   (Central)  │  │   (Metrics)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   CAMPAIGN    │
                    │  "PDCC Q1"    │
                    └───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐        ┌─────────┐
   │  TEXT   │         │VOICEMAIL│        │  EMAIL  │
   │STRATEGY │         │STRATEGY │        │STRATEGY │
   └─────────┘         └─────────┘        └─────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌───────────────┐
                    │   CONTACTS    │
                    │  (Assigned)   │
                    └───────────────┘
```

---

## Core Entities

### 1. Campaign (Central Hub)

**Purpose:** Organize all marketing efforts for a specific audience/goal

**Properties:**
- **Identity:** Name, type, description, tags
- **Audience:** Assigned contacts
- **Strategies:** Active strategies (SMS, voicemail, email)
- **Schedule:** Start/end dates, frequency
- **Status:** Draft, active, paused, completed
- **Analytics:** Performance across all channels
- **Budget:** Optional budget tracking

**Campaign Types:**
- Sphere of Influence
- Past Clients
- Neighborhood Farming (PDCC, IWCC, etc.)
- Expired Listings
- High Equity Homeowners
- New Listings
- Open House Follow-up
- Custom

**Example:**
```json
{
  "name": "PDCC Expired Listings - Q1 2026",
  "type": "neighborhood_expireds",
  "neighborhood": "PDCC",
  "status": "active",
  "contacts": [/* ObjectIds */],
  "strategies": {
    "voicemail": { enabled: true, deployed: "2026-01-15" },
    "email": { enabled: true, deployed: "2026-01-16" },
    "text": { enabled: false }
  },
  "analytics": {
    "totalContacts": 150,
    "voicemailsSent": 150,
    "emailsSent": 148,
    "textsSent": 0,
    "responses": 12,
    "conversions": 2
  }
}
```

---

### 2. Strategy (Deployment Method)

**Purpose:** Define HOW to communicate within a campaign

**Three Strategy Types:**

#### A. Text/SMS Strategy
- **Message template** with personalization
- **Send schedule** (immediate, scheduled, drip)
- **Link tracking** (optional UTM links)
- **Twilio integration**
- **Opt-out handling**

#### B. Voicemail Strategy

⚠️ **IMPORTANT UPDATE (2026-01-07):** Drop Cowboy API limitations require dual-route implementation. See [Drop Cowboy API Limitations](./DROP_COWBOY_API_LIMITATIONS.md) for details.

**Two Modes Available:**

**Simple Mode (Current - Standard Accounts):**
- User manually uploads recordings to Drop Cowboy web portal
- System fetches list of available recording_id's
- User selects recording for campaign
- Direct RVM submission with recording_id
- ✅ **Active now**

**Full Mode (Future - BYOC Accounts):**
- **Script generation** (AI or manual)
- **Voice selection** (11 Labs voices)
- **Audio generation**
- **Drop Cowboy integration** via audio_url parameter
- **Delivery tracking**
- ⏳ **Preserved for BYOC activation**

#### C. Email Strategy
- **Email template** (HTML/plain text)
- **Subject line variants** (A/B testing)
- **Resend/SendGrid integration**
- **Open/click tracking**
- **Unsubscribe handling**

**Strategy Properties (Common):**
```typescript
interface Strategy {
  campaignId: ObjectId;
  strategyType: 'text' | 'voicemail' | 'email';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';

  // Content
  template: string;
  personalizationFields: string[]; // e.g., ['firstName', 'address']

  // Schedule
  deploymentType: 'immediate' | 'scheduled' | 'drip';
  scheduledDate?: Date;
  dripConfig?: {
    sequence: Array<{ delay: number; message: string }>;
  };

  // Targeting
  targetContacts: ObjectId[]; // Subset of campaign contacts
  excludeContacts?: ObjectId[]; // Opt-outs, DNC

  // Tracking
  analytics: {
    sent: number;
    delivered: number;
    opened?: number; // Email only
    clicked?: number; // Email/SMS links
    listened?: number; // Voicemail only
    responded: number;
    failed: number;
  };
}
```

---

### 3. Contact-Campaign Assignment

**Purpose:** Track which contacts are in which campaigns

**Properties:**
- Contact reference
- Campaign reference
- Assignment date
- Source (manual, import, filter)
- Tags/segments within campaign
- Opt-out status per campaign
- Response tracking

**Example:**
```json
{
  "contactId": "60a1b2c3d4e5f6g7h8i9j0",
  "campaignId": "70a1b2c3d4e5f6g7h8i9j1",
  "assignedAt": "2026-01-10T10:00:00Z",
  "source": "csv_import",
  "segment": "high_priority",
  "strategies": {
    "voicemail": { status: "delivered", listenedAt: "2026-01-15T14:32:00Z" },
    "email": { status: "opened", openedAt: "2026-01-16T09:15:00Z" },
    "text": { status: "not_sent" }
  },
  "responded": true,
  "responseDate": "2026-01-17T11:00:00Z",
  "notes": "Interested in listing consultation"
}
```

---

## Database Schema

### Campaign Model (Enhanced)

```typescript
interface Campaign {
  _id: ObjectId;
  userId: ObjectId; // Agent owner
  teamId?: ObjectId;

  // Identity
  name: string;
  type: CampaignType;
  description?: string;
  tags: string[];
  neighborhood?: string;

  // Status & Lifecycle
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;

  // Contact Management
  totalContacts: number;
  contactSegments?: Array<{
    name: string;
    contactIds: ObjectId[];
    filters?: any;
  }>;

  // Active Strategies
  activeStrategies: {
    voicemail: boolean;
    email: boolean;
    text: boolean;
  };

  // Budget & Cost Tracking
  budget?: {
    total: number;
    spent: number;
    costPerContact: number;
  };

  // Unified Analytics (across all strategies)
  analytics: {
    totalReach: number; // Unique contacts reached
    totalTouchpoints: number; // Sum of all messages sent
    responses: number;
    conversions: number;
    conversionRate: number;
    roi?: number;

    // Per-strategy breakdown
    voicemailStats: StrategyStats;
    emailStats: StrategyStats;
    textStats: StrategyStats;
  };

  // Integration IDs
  integrations: {
    dropCowboyId?: string;
    twilioId?: string;
    sendgridId?: string;
  };
}

interface StrategyStats {
  sent: number;
  delivered: number;
  engaged: number; // Opened, listened, clicked
  responded: number;
  cost: number;
}
```

### CampaignStrategy Model (NEW)

```typescript
interface CampaignStrategy {
  _id: ObjectId;
  campaignId: ObjectId;
  userId: ObjectId;

  // Strategy Type
  strategyType: 'text' | 'voicemail' | 'email';

  // Status
  status: 'draft' | 'generating' | 'ready' | 'scheduled' | 'active' | 'paused' | 'completed';

  // Content
  content: {
    // For Text
    smsMessage?: string;
    includeLink?: boolean;
    linkUrl?: string;

    // For Voicemail
    scriptTemplate?: string;
    voiceId?: string; // 11 Labs voice
    audioGenerated?: boolean;

    // For Email
    subject?: string;
    htmlTemplate?: string;
    plainTextTemplate?: string;
    fromName?: string;
    fromEmail?: string;
  };

  // Personalization
  personalizationEnabled: boolean;
  personalizationFields: Array<{
    field: string; // e.g., 'firstName'
    fallback?: string; // Default if missing
  }>;

  // Deployment
  deploymentType: 'immediate' | 'scheduled' | 'drip';
  scheduledDate?: Date;
  dripSequence?: Array<{
    order: number;
    delayDays: number;
    content: any;
  }>;

  // Targeting
  targetAll: boolean; // Target all campaign contacts
  targetSegments?: string[]; // Specific segments
  excludeContactIds?: ObjectId[]; // Opt-outs, DNC

  // Execution Tracking
  execution: {
    startedAt?: Date;
    completedAt?: Date;
    lastProcessedAt?: Date;
    processedCount: number;
    successCount: number;
    failureCount: number;
  };

  // Analytics
  analytics: {
    sent: number;
    delivered: number;
    bounced: number;

    // Channel-specific
    opened?: number; // Email
    clicked?: number; // Email/SMS
    listened?: number; // Voicemail

    // Engagement
    responded: number;
    responseRate: number;

    // Cost
    totalCost: number;
    costPerContact: number;
  };

  // Integration
  provider: 'twilio' | 'dropcowboy' | 'sendgrid' | 'resend';
  providerCampaignId?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### ContactCampaign Model (Enhanced)

```typescript
interface ContactCampaign {
  _id: ObjectId;
  contactId: ObjectId;
  campaignId: ObjectId;
  userId: ObjectId;

  // Assignment
  assignedAt: Date;
  source: 'manual' | 'import' | 'filter' | 'api';
  importBatchId?: ObjectId;

  // Segmentation
  segment?: string; // 'high_priority', 'warm', 'cold', etc.
  tags: string[];

  // Strategy Tracking (per contact)
  strategies: {
    voicemail?: {
      scriptId?: ObjectId;
      status: DeliveryStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      listenedAt?: Date;
      duration?: number;
    };

    email?: {
      messageId?: string;
      status: DeliveryStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
    };

    text?: {
      messageId?: string;
      status: DeliveryStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      respondedAt?: Date;
      responseText?: string;
    };
  };

  // Overall Engagement
  engagement: {
    totalTouchpoints: number;
    responded: boolean;
    responseDate?: Date;
    responseChannel?: 'voicemail' | 'email' | 'text' | 'phone' | 'in-person';
    converted: boolean;
    conversionDate?: Date;
    conversionValue?: number;
  };

  // Compliance
  optedOut: boolean;
  optedOutDate?: Date;
  optedOutChannel?: 'voicemail' | 'email' | 'text' | 'all';
  doNotContact: boolean;

  // Notes
  notes?: string;
  lastActivityDate?: Date;

  updatedAt: Date;
}
```

### StrategyExecution Model (NEW - tracks individual message sends)

```typescript
interface StrategyExecution {
  _id: ObjectId;
  strategyId: ObjectId;
  campaignId: ObjectId;
  contactId: ObjectId;
  userId: ObjectId;

  // Execution Details
  strategyType: 'text' | 'voicemail' | 'email';
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'engaged';

  // Content (personalized)
  content: {
    finalMessage?: string; // After personalization
    audioUrl?: string; // Voicemail
    emailHtml?: string; // Email
  };

  // Provider Details
  provider: string;
  providerMessageId?: string;
  providerResponse?: any;

  // Delivery Tracking
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Engagement Tracking
  engagedAt?: Date; // Opened, listened, clicked
  engagementType?: 'open' | 'click' | 'listen' | 'respond';
  engagementData?: any;

  // Cost
  cost: number;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## User Experience Flow

### 1. Campaign Creation Workflow

**Route:** `/agent/campaigns/new`

**Steps:**

1. **Basic Info**
   - Campaign name
   - Campaign type (dropdown)
   - Optional: Neighborhood, description, tags
   - Date range (optional)

2. **Add Contacts**
   - **Option A:** Select from existing CRM contacts
     - Filter by tags, location, status
     - Multi-select checkboxes
   - **Option B:** Import from file (CSV, Excel)
     - Upload → Map fields → Preview → Import
   - **Option C:** Import from Google Contacts
   - **Option D:** Import from Mojo Dialer
   - **Option E:** Create segment with filters
     - Auto-populate based on criteria

3. **Review Contacts**
   - See list of assigned contacts
   - Edit/remove individual contacts
   - Create segments (High Priority, Warm, Cold, etc.)
   - Check for duplicates across campaigns

4. **Choose Strategies**
   - **Checkbox options:**
     - ☐ Voicemail Drop
     - ☐ Email
     - ☐ Text/SMS
   - Configure each selected strategy
   - Set deployment order (if multi-channel)

5. **Configure Strategies**
   - For each selected strategy, configure:
     - Template/message
     - Personalization fields
     - Schedule (immediate vs. scheduled)
     - Budget allocation (optional)

6. **Review & Launch**
   - Campaign summary
   - Cost estimate
   - Contact count
   - Preview messages
   - **Actions:**
     - Save as Draft
     - Schedule for Later
     - Launch Now

---

### 2. Campaign Dashboard

**Route:** `/agent/campaigns`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  CAMPAIGNS                                     [+ New]       │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Active] [Paused] [Completed]              │
│  Search: [________________]                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PDCC Expired Listings - Q1 2026          [Active]   │  │
│  │  150 contacts • 3 strategies active                   │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                    │  │
│  │  │ 📞 150 │ │ ✉️ 148 │ │ 💬 0   │   12 responses    │  │
│  │  │ sent   │ │ sent   │ │ sent   │   2 conversions   │  │
│  │  └────────┘ └────────┘ └────────┘                    │  │
│  │  [View Details]  [Pause]  [Export]                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sphere of Influence - Monthly      [Active]         │  │
│  │  250 contacts • 2 strategies active                   │  │
│  │  ...                                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Campaign cards with quick stats
- Status badges (Active, Paused, Completed)
- Strategy indicators (icons for active strategies)
- Quick actions (Pause, Resume, Duplicate, Archive)
- Filters and search
- Sort by date, performance, name

---

### 3. Campaign Detail View

**Route:** `/agent/campaigns/[id]`

**Tabs:**

#### Tab 1: Overview
- Campaign info
- Status controls (Pause/Resume/Complete)
- **Unified Analytics Dashboard:**
  - Total reach
  - Total touchpoints
  - Response rate
  - Conversion rate
  - ROI
- **Timeline Chart:**
  - Messages sent over time
  - Engagement over time
  - All channels on one chart
- **Strategy Breakdown:**
  - Voicemail stats
  - Email stats
  - Text stats

#### Tab 2: Contacts
- Searchable table of all contacts
- Columns:
  - Name
  - Phone/Email
  - Segment
  - Voicemail status (✓ sent, ✓ listened)
  - Email status (✓ sent, ✓ opened)
  - Text status (✓ sent, ✓ replied)
  - Last activity
  - Response (Yes/No)
- Filters:
  - By segment
  - By response status
  - By strategy engagement
- Actions:
  - View contact detail
  - Remove from campaign
  - Add note
  - Mark as responded/converted

#### Tab 3: Strategies
- **Voicemail Strategy Card:**
  - Status, stats
  - [Generate Scripts] [Generate Audio] [Deploy]
  - Preview scripts
  - Listen to sample audio
- **Email Strategy Card:**
  - Status, stats
  - [Edit Template] [Send Test] [Deploy]
  - Preview email
  - A/B test results
- **Text Strategy Card:**
  - Status, stats
  - [Edit Message] [Send Test] [Deploy]
  - Preview message
  - Link click tracking

#### Tab 4: Analytics
- Detailed performance metrics
- Funnel visualization
  - Sent → Delivered → Engaged → Responded → Converted
- Channel comparison
  - Which strategy performed best?
- Time-of-day analysis
- Geographic breakdown
- Export to CSV/PDF

#### Tab 5: Activity Feed
- Real-time updates
  - "Sarah Johnson listened to voicemail at 2:15 PM"
  - "Mike Davis opened email at 9:32 AM"
  - "Jessica Lee replied to text message"
- Filterable by strategy type
- Shows responses and conversions

---

### 4. CRM Integration

**Route:** `/agent/crm`

**Contact List Enhancements:**

**New Filters:**
- **Campaign Membership:**
  - "In Campaign: [Dropdown of campaigns]"
  - "Not in any campaign"
  - "In multiple campaigns"
- **Campaign Response:**
  - "Responded to any campaign"
  - "Converted from campaign"
  - "Never responded"

**Contact Detail Enhancements:**

**New Section: Campaign History**
```
┌─────────────────────────────────────────────────────────────┐
│  CAMPAIGN HISTORY                                            │
├─────────────────────────────────────────────────────────────┤
│  PDCC Expired Listings - Q1 2026               [Active]     │
│  Joined: Jan 10, 2026                                       │
│  • Voicemail: Sent Jan 15, Listened Jan 15 ✓               │
│  • Email: Sent Jan 16, Opened Jan 16 ✓                     │
│  • Text: Not sent                                           │
│  Response: Yes (Jan 17) - Interested in consultation        │
│  ──────────────────────────────────────────────────────     │
│  Sphere of Influence - December 2025        [Completed]     │
│  Joined: Dec 1, 2025                                        │
│  • Email: Sent Dec 1, Not opened                            │
│  Response: No                                                │
└─────────────────────────────────────────────────────────────┘
```

**Actions from Contact:**
- Add to Campaign (button)
- View all campaigns
- Remove from campaign

---

### 5. Strategy Templates Library

**Route:** `/agent/campaigns/templates`

**Features:**
- Pre-built campaign templates
  - "Expired Listings - Initial Outreach"
  - "Past Client - Quarterly Check-in"
  - "Sphere - Market Update"
  - "High Equity - Seller Opportunity"
- Each template includes:
  - Recommended strategies (✓ Voicemail, ✓ Email, ✗ Text)
  - Pre-written scripts/messages
  - Suggested timeline
  - Best practices
- **Use Template** → Copies to new campaign

---

## Agent Dashboard Restructure

### Current Dashboard Structure
```
/agent/
  /crm/          - Contact management
  /applications/ - Application review
```

### NEW Dashboard Structure
```
/agent/
  /dashboard/     - Overview/home (NEW)
  /campaigns/     - Campaign management (NEW - CENTRAL)
    /new          - Create campaign
    /[id]         - Campaign detail
    /templates    - Strategy templates
    /analytics    - Cross-campaign analytics
  /crm/           - Contact management (ENHANCED)
    /contacts/    - Contact list
    /[id]         - Contact detail (with campaign history)
    /import       - Import contacts
    /segments     - Saved segments/filters
  /strategies/    - Strategy management (NEW)
    /voicemail    - Voicemail strategy library
    /email        - Email template library
    /text         - SMS template library
  /analytics/     - Global analytics (NEW)
    /overview     - All campaigns overview
    /performance  - Performance reports
    /roi          - ROI tracking
  /applications/  - Application review (EXISTING)
```

### New Dashboard Home (`/agent/dashboard`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, Joseph!                                       │
├─────────────────────────────────────────────────────────────┤
│  ACTIVE CAMPAIGNS                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ PDCC Q1  │ │ Sphere   │ │ Expireds │                    │
│  │ 150 cont │ │ 250 cont │ │ 89 cont  │                    │
│  │ 12 resp  │ │ 8 resp   │ │ 5 resp   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
├─────────────────────────────────────────────────────────────┤
│  THIS WEEK'S ACTIVITY                                        │
│  📞 450 voicemails sent  •  ✉️ 520 emails sent             │
│  💬 120 texts sent       •  🎯 35 responses                 │
├─────────────────────────────────────────────────────────────┤
│  RECENT RESPONSES                                            │
│  • Sarah Johnson responded to PDCC Q1 - 2 hours ago        │
│  • Mike Davis opened email in Sphere - 4 hours ago         │
│  • ...                                                       │
├─────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                               │
│  [+ Create Campaign]  [Import Contacts]  [View Analytics]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Action Plan

### Phase 1: Database & Models (Week 1-2)

**Tasks:**
1. ✅ Create Campaign model (already done, need enhancements)
2. ✅ Create CampaignStrategy model (NEW)
3. ✅ Enhance ContactCampaign model (already done, need enhancements)
4. Create StrategyExecution model (NEW)
5. Update Contact model with campaign history (already done)
6. Create database indexes for performance

**Files to Create/Modify:**
- `src/models/Campaign.ts` - Enhance existing
- `src/models/CampaignStrategy.ts` - NEW
- `src/models/ContactCampaign.ts` - Enhance existing
- `src/models/StrategyExecution.ts` - NEW
- `src/models/contact.ts` - Already updated

### Phase 2: Service Layer (Week 2-3)

**Create Strategy Services:**
1. `src/lib/services/campaign.service.ts`
   - Create, update, delete campaigns
   - Assign contacts
   - Manage segments
   - Calculate analytics

2. `src/lib/services/strategy-manager.service.ts`
   - Deploy strategies
   - Coordinate multi-channel
   - Track execution
   - Handle failures

3. `src/lib/services/voicemail-strategy.service.ts`
   - Script generation (reuse existing)
   - Audio generation (11 Labs)
   - Drop Cowboy deployment

4. `src/lib/services/email-strategy.service.ts`
   - Email template processing
   - Personalization
   - SendGrid/Resend integration
   - Track opens/clicks

5. `src/lib/services/text-strategy.service.ts`
   - SMS template processing
   - Twilio integration
   - Link tracking
   - Response handling

6. `src/lib/services/analytics.service.ts`
   - Campaign analytics
   - Cross-campaign analytics
   - ROI calculation
   - Report generation

### Phase 3: API Routes (Week 3-4)

**Campaign Management:**
- `POST /api/agent/campaigns/create`
- `GET /api/agent/campaigns/list`
- `GET /api/agent/campaigns/[id]`
- `PATCH /api/agent/campaigns/[id]`
- `DELETE /api/agent/campaigns/[id]`
- `POST /api/agent/campaigns/[id]/contacts/add`
- `DELETE /api/agent/campaigns/[id]/contacts/remove`
- `POST /api/agent/campaigns/[id]/segments/create`

**Strategy Management:**
- `POST /api/agent/campaigns/[id]/strategies/create`
- `PATCH /api/agent/campaigns/[id]/strategies/[strategyId]`
- `POST /api/agent/campaigns/[id]/strategies/[strategyId]/deploy`
- `POST /api/agent/campaigns/[id]/strategies/[strategyId]/pause`
- `POST /api/agent/campaigns/[id]/strategies/[strategyId]/resume`

**Analytics:**
- `GET /api/agent/campaigns/[id]/analytics`
- `GET /api/agent/campaigns/[id]/activity-feed`
- `GET /api/agent/campaigns/analytics/overview`
- `GET /api/agent/analytics/performance`

**CRM Integration:**
- `GET /api/agent/crm/contacts?campaign=[id]`
- `GET /api/agent/crm/contacts/[id]/campaigns`
- `POST /api/agent/crm/contacts/[id]/campaigns/add`

### Phase 4: Frontend - Campaign UI (Week 4-6)

**New Pages:**
1. `/agent/dashboard` - Dashboard home
2. `/agent/campaigns` - Campaign list
3. `/agent/campaigns/new` - Create campaign wizard
4. `/agent/campaigns/[id]` - Campaign detail
5. `/agent/campaigns/templates` - Template library
6. `/agent/strategies/*` - Strategy management

**New Components:**
1. `CampaignCard.tsx` - Campaign summary card
2. `CampaignWizard.tsx` - Multi-step campaign creation
3. `StrategySelector.tsx` - Choose strategies
4. `StrategyConfigurator.tsx` - Configure strategy
5. `VoicemailStrategyForm.tsx`
6. `EmailStrategyForm.tsx`
7. `TextStrategyForm.tsx`
8. `CampaignAnalyticsDashboard.tsx`
9. `ContactAssignment.tsx` - Assign contacts to campaign
10. `ActivityFeed.tsx` - Real-time activity stream
11. `StrategyExecutionTracker.tsx` - Track strategy deployment

### Phase 5: Frontend - CRM Enhancements (Week 6-7)

**Enhance Existing:**
1. Contact list with campaign filters
2. Contact detail with campaign history section
3. Add to campaign action
4. Bulk campaign assignment

### Phase 6: Integration & Testing (Week 7-8)

**Integrations:**
1. Twilio (SMS)
2. Drop Cowboy (Voicemail)
3. SendGrid/Resend (Email)
4. 11 Labs (Voice generation)

**Testing:**
1. End-to-end campaign creation
2. Multi-strategy deployment
3. Analytics accuracy
4. Contact assignment logic
5. Opt-out handling
6. Cost tracking

### Phase 7: Migration & Launch (Week 8-9)

**Migration:**
1. Migrate existing Drop Cowboy data (if any)
2. Create default campaign templates
3. Set up analytics baseline
4. User training documentation

**Launch:**
1. Beta test with one agent
2. Gather feedback
3. Iterate
4. Full rollout

---

## Key Benefits of This Architecture

### For Agents:
1. **Centralized:** All marketing in one place
2. **Multi-channel:** Coordinate SMS, voicemail, email
3. **Organized:** Campaigns group related efforts
4. **Insights:** Unified analytics across channels
5. **Scalable:** Easy to add new strategies
6. **Efficient:** Bulk operations, templates, automation

### For Development:
1. **Modular:** Each strategy is independent
2. **Extensible:** Easy to add new strategy types
3. **Maintainable:** Clear separation of concerns
4. **Testable:** Each service can be tested independently
5. **Flexible:** Can mix and match strategies

### For Business:
1. **ROI Tracking:** Clear campaign-level ROI
2. **Cost Control:** Budget per campaign
3. **Compliance:** Centralized opt-out management
4. **Reporting:** Comprehensive performance reports
5. **Growth:** Foundation for advanced features (A/B testing, ML optimization)

---

## Future Enhancements (Post-MVP)

1. **A/B Testing:** Test message variants
2. **Drip Campaigns:** Automated sequences
3. **Triggers:** Event-based campaigns (new listing → send email)
4. **AI Optimization:** ML-powered send time optimization
5. **Lead Scoring:** Engagement-based lead scoring
6. **Integration Marketplace:** Connect more tools
7. **Team Collaboration:** Share campaigns, assign contacts
8. **Mobile App:** Campaign monitoring on mobile
9. **Voice Campaigns:** Live calling with scripts
10. **Social Media:** Add social as strategy type

---

## Voicemail Dual-Route Implementation (Updated 2026-01-07)

### Background

On 2026-01-07, we discovered that Drop Cowboy's `/media` POST endpoint does **NOT** upload audio files. Instead, it returns a list of existing recordings in the account. This fundamentally impacts our voicemail campaign architecture.

See detailed documentation:
- [Drop Cowboy API Limitations](./DROP_COWBOY_API_LIMITATIONS.md)
- [Simplified Workflow Action Plan](./VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md)
- [Full Pipeline Preserved](./VOICEMAIL_FULL_PIPELINE_PRESERVED.md)

### Dual-Route Strategy

We maintain **two parallel voicemail campaign routes**:

#### Route 1: Simple Mode (Active Now)
**Path:** `/api/campaigns/[id]/send-simple`

**Workflow:** Contacts → Audio Selection → Send

**Features:**
- Fetch existing Drop Cowboy recordings via API
- User selects from available recording_id's
- Direct RVM submission
- No script generation
- No audio generation
- ✅ **Works with standard Drop Cowboy accounts**

**Use Case:**
- Standard Drop Cowboy accounts (no BYOC)
- Quick campaign deployment
- Pre-recorded general messages
- Cost-effective ($0.10/voicemail)

#### Route 2: Full Mode (Preserved for BYOC)
**Path:** `/api/campaigns/[id]/send`

**Workflow:** Contacts → Scripts → Audio → Preview → Send

**Features:**
- AI script generation (Groq/Claude)
- 11Labs audio synthesis
- Cloudinary storage
- Dynamic audio via `audio_url` parameter
- ⏳ **Requires BYOC Drop Cowboy account**

**Use Case:**
- BYOC Drop Cowboy accounts
- Personalized campaigns
- Dynamic content per contact
- Premium quality ($0.05-0.08/voicemail + AI costs)

### Implementation Status

**Completed:**
- ✅ Full pipeline (scripts, audio, preview)
- ✅ Script generation service
- ✅ 11Labs integration
- ✅ Cloudinary storage
- ✅ All frontend components

**In Progress:**
- 🔄 Simplified route implementation
- 🔄 Recording list endpoint
- 🔄 Recording selector component

**Future (BYOC Activation):**
- ⏳ Enable audio_url parameter
- ⏳ Activate full pipeline
- ⏳ User mode selection (simple vs full)

### Migration Plan

When BYOC account is activated:

1. **Update configuration:**
   ```typescript
   DROP_COWBOY_ACCOUNT_TYPE=byoc
   ```

2. **Enable full pipeline:**
   - Change `useFullPipeline = true` in UI
   - Use `/api/campaigns/[id]/send` route
   - Pass `audio_url` instead of `recording_id`

3. **Optional: Keep both modes:**
   - Simple mode for quick campaigns
   - Full mode for personalized campaigns
   - User chooses per campaign

### Files Preserved

All full pipeline code is **preserved and functional**:
- API routes: `/send`, `/scripts`, `/upload-audio`
- Services: `script-generation.service.ts`
- Components: `PipelineScriptsStep`, `PipelineAudioStep`, `PipelinePreviewStep`
- Models: `VoicemailScript`

**Do not delete!** These will be reactivated when BYOC is available.

---

## Next Steps

1. **Immediate (Week 1):**
   - ✅ Review this architecture with stakeholders
   - ✅ Document Drop Cowboy limitations
   - 🔄 Implement simplified voicemail route
   - 🔄 Build recording selector UI

2. **Short-term (Week 2-4):**
   - Test simplified workflow end-to-end
   - Deploy to production
   - User documentation
   - Contact Drop Cowboy about BYOC

3. **Long-term (Post-BYOC):**
   - **Prioritize features** for MVP
   - **Create detailed wireframes** for full campaign system
   - **Begin Phase 1** implementation (Database & Models)
   - **Set up project timeline** with milestones
   - **Allocate resources** (developers, designers, QA)

---

## Questions to Consider

1. **Budget tracking:** Do we want per-campaign budgets?
2. **Team features:** Multi-agent teams sharing campaigns?
3. **Approval workflow:** Do campaigns need approval before sending?
4. **Compliance:** What compliance features are required (TCPA, CAN-SPAM)?
5. **Reporting:** What reports do agents need?
6. **Automation:** How much automation is desired?

---

**Document Version:** 1.1
**Last Updated:** 2026-01-07
**Author:** AI Architecture Team
**Status:** In Progress - Voicemail Dual-Route Implementation
**Change Log:**
- v1.1 (2026-01-07): Added Voicemail Dual-Route Implementation section
- v1.0 (2026-01-02): Initial document
