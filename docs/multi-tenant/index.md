# ChatRealty.io Multi-Tenant Architecture

**Created**: March 16, 2026
**Status**: Architecture Design Complete
**Phase**: Implementation Planning

---

## 🎯 EXECUTIVE SUMMARY

### The Vision

**ChatRealty.io** is a multi-tenant real estate platform that functions as a **cooperative agent network** rather than a centralized marketplace like Zillow. Agents join the network, contribute their MLS data, and receive:

- Their own branded website (subdomain or custom domain)
- Access to the entire network's MLS data pool
- AI-powered chat and interactive map tools
- Automatic referral fee generation for out-of-market leads
- Revenue share from data usage across the network

**jpsrealtor.com** is the proof-of-concept and will become the first tenant when the platform launches as ChatRealty.io.

### Core Differentiator

Unlike Zillow (centralized, agent-hostile) or traditional IDX websites (siloed, limited data), ChatRealty creates a **win-win-win ecosystem**:

- **Agents win**: More listings, more leads, passive referral income
- **Clients win**: Better search tools, nationwide coverage, seamless experience
- **Platform wins**: Data network effects, multiple revenue streams

---

## 🏗️ PLATFORM ARCHITECTURE

### Multi-Tenancy Model

**Hybrid Domain Strategy**:

```
Free Tier (Subdomain):
chatrealty.io/agent/jane-smith/{license-number}/landing

Premium Tier (Custom Domain):
janesmith.com → Points to chatrealty.io backend
jpsrealtor.com → Points to chatrealty.io backend
```

**Benefits**:
- Free tier: Easy onboarding, no DNS setup
- Premium tier: Professional branding, SEO ownership
- Same backend, same features, just different URLs

### Agent Types & Tiers

**Phase 1: Data-Share Partners (Company Members)**
```
Requirements:
✅ Have unique MLS data not in network
✅ Sign data-share agreement
✅ Pay monthly fee + % commission split
✅ Revenue share model

Benefits:
✅ Join the company (eXp structure)
✅ Access entire network's MLS data
✅ Earn passive income from data fees (5%)
✅ Automatic referrals (15-25%)
```

**Phase 2: IDX Solo Agents (Future)**
```
Requirements:
✅ Any licensed agent
✅ Bring own IDX feed
✅ Pay monthly SaaS fee

Benefits:
✅ Professional website
✅ AI chat tools
✅ No revenue sharing
✅ No network data access
```

**Current Focus**: Phase 1 (Data-share partners only)

---

## 💰 REVENUE MODEL

### Agent Revenue Streams

**1. Monthly Subscription** (Company Revenue)
```
Agent pays:
- Base fee: TBD (e.g., $99/mo)
- Premium domain: +$10/mo
- Transaction fees at closing

Company gets:
- Recurring revenue
- Platform maintenance
```

**2. Commission Split** (Per Transaction)
```
Agent closes deal:
- Company takes X% of gross commission
- Agent keeps remainder
- Standard for eXp-style model
```

**3. Data Broker Fee** (5%)
```
Agent Joe brings CRMLS data:
- Any deal using CRMLS data → Joe gets 5%
- Passive income from network usage
- Incentivizes bringing valuable MLS sources
```

**4. Referral Fees** (15-25%)
```
Out-of-state referral: 25%
- Client wants Phoenix home
- Agent in CA refers to AZ agent
- Referring agent gets 25%

ChatRealty swipe match: 15%
- Client finds agent via swipe feature
- ChatRealty gets 15% referral fee
- Agent gets lead from platform
```

**5. Handoff Fee** (5%)
```
Agent A at capacity:
- Confirms Agent B availability
- Introduces client to Agent B
- Agent A earns 5% handoff fee
- Prevents handoff chains
```

### User Subscription Tiers

**Tier 1: Anonymous (No Login)**
```
Access:
- 15 minute browsing window OR limited clicks
- Daily reset
- No AI features
- No account creation

Purpose: Product teaser, drive signups
```

**Tier 2: Free (Logged In)**
```
Cost: $0/month

Access:
- Unlimited browsing
- Limited AI queries per day
- Save favorites
- Basic features

Purpose: Casual browsers, nurture leads
```

**Tier 3: Pro ($10/month)**
```
Cost: $10/month

Access:
- Unlimited browsing
- More AI queries per day
- Market research tools
- Advanced filters

Purpose: Active searchers, serious buyers
```

**Tier 4: Ultimate ($20/month)**
```
Cost: $20/month

Access:
- Unlimited AI features
- Unlimited queries
- Premium tools
- Priority support

Purpose: Power users, frequent searchers
```

**Tier 5: Investor ($99/month)**
```
Cost: $99/month

Access:
- Everything in Ultimate
- Advanced financial calculators
- Unlimited cashflow analysis
- Appreciation comparisons
- ROI modeling
- Bulk property analysis

Purpose: Real estate investors, portfolio builders
```

### Agent-Sponsored Subscriptions

**Model**: Deferred Billing
```
Agent sponsors client for Ultimate ($20/mo):

Month 1-3:
- Client gets full access
- Fees accrue ($20/mo)
- Agent not billed yet

After 3 months (no deal closed):
- Agent gets invoice for $60
- Agent must pay

If deal closes in Month 5:
- Agent already paid $60 (Month 3 invoice)
- No retroactive reimbursement
- Creates urgency for agent to close deals
```

**Incentive Structure**:
- Agents won't sponsor tire-kickers indefinitely
- Clients get motivated (agent paying for them)
- Platform gets paid either way (agent or client)

### Representation Agreements

**Purpose**: Lock in agent-client relationship, unlock premium features

**Structure**:
```
Duration: 30 days (rolling)

Client benefits:
✅ Unlock agent-specific features:
   - Schedule showings
   - Submit offers
   - Direct agent messaging
   - Personalized market alerts
✅ Still subject to subscription tier limits
   (Free tier can have agreement, but limited AI queries)

Platform benefits:
✅ Formalized relationship
✅ Reduces agent competition
✅ Enables automatic renewals
✅ Legal framework for commissions
```

**Expiration Flow**:
```
Day 28: Email notification "Agreement expires in 2 days"
Day 30: Toast notification "Representation agreement expired"
        Modal: "Renew with [Agent] or choose new agent"

Options:
1. Renew with same agent (30 more days)
2. Choose different agent
3. Browse without agreement (limited features)
```

---

## 🗄️ DATA ARCHITECTURE

### MLS Data Sharing Model

**Principle**: First-come, first-served data broker rights

**Example**:
```
Agent Joe (California):
- Brings CRMLS data → Joe is CRMLS data broker
- Brings GPS data → Joe is GPS data broker

Agent John (California):
- Also has CRMLS access → Can't contribute (already in network)
- Brings San Diego MLS → John becomes SD MLS data broker
- Can still join network (bring unique SD data)

Agent Sarah (California):
- Has CRMLS + GPS → All duplicate data
- No unique MLS → Can't join as data broker
- Can join Joe or John's team instead
```

**Data Coverage Tracking**:
```typescript
agentProfile: {
  mlsDataSources: [
    {
      name: "GPS (Greater Palm Springs)",
      mlsId: "GPS-001",
      coverage: {
        type: "MultiPolygon", // GeoJSON
        coordinates: [...],
        cities: ["Palm Desert", "Indian Wells", "La Quinta"],
        counties: ["Riverside"],
        states: ["CA"]
      },
      listingCount: 15234,
      lastSyncedAt: "2026-03-16T10:30:00Z",
      status: "active",
      dataShareAgreementSigned: true,
      dataShareStartDate: "2025-01-01"
    }
  ]
}
```

**Listing Attribution**:
```typescript
// Each listing stores its data source
{
  listingKey: "12345-GPS",
  address: "123 Main St, San Diego, CA",
  price: 450000,

  dataSource: {
    agentId: "john-doe-id", // Data broker for this MLS
    mlsName: "San Diego MLS",
    contributedAt: "2026-03-01"
  }
}

// When deal closes:
// → Find dataSource.agentId
// → Pay that agent 5% data fee
```

### Agent Territory Model

**Licensed Territory** (Where agent can transact):
```typescript
agentProfile: {
  licenses: [
    {
      state: "CA",
      licenseNumber: "02083526",
      status: "active",
      expiresAt: "2027-12-31"
    },
    {
      state: "AZ",
      licenseNumber: "BR123456",
      status: "active",
      expiresAt: "2028-06-30"
    }
  ]
}
```

**Data Territory** (Where agent has MLS data):
```typescript
agentProfile: {
  mlsDataSources: [...] // GeoJSON boundaries
}
```

**Commission Scenarios**:

**Scenario A: In-State, In-Network Data**
```
Agent Joe (CA license, CRMLS data):
- Client finds home in San Diego (John's SD MLS data)
- Joe can transact (has CA license)
- John gets 5% data fee
- Joe closes deal, keeps 95%
```

**Scenario B: Out-of-State, In-Network Agent**
```
Agent Joe (CA license only):
- Client wants Phoenix home (Alex's AZ data)
- Joe can't transact (no AZ license)
- Joe refers to Alex → 25% referral fee
- Alex closes deal, keeps 75%
- Alex also gets 5% data fee (his data)
```

**Scenario C: Out-of-State, External Agent**
```
Agent Joe (CA license):
- Client wants Phoenix home (Alex's AZ data)
- Joe refers to EXTERNAL Phoenix agent (not in network)
- Joe gets small external referral fee (~3%)
- Alex gets 5% data usage fee
- External agent closes deal
```

---

## 🌐 BRANDING & TERRITORY TRANSITIONS

### User Experience Across Territories

**On-Territory (Normal)**:
```
User on jpsrealtor.com:
"Show me homes in Palm Desert"

→ Joseph's branding throughout
→ Joseph's listings featured
→ No territory notifications
```

**Off-Territory (Network Agent)**:
```
User on jpsrealtor.com:
"Show me homes in Phoenix"

→ Toast notification: "Now viewing Phoenix listings from John Doe"
→ Mobile top bar: "Phoenix, AZ • John Doe"
→ Desktop banner: "🏠 Browsing Phoenix • Agent: John Doe • [Contact] [Back to Palm Desert]"
→ Listing cards show: "Listed by: John Doe, Phoenix Real Estate"
→ User stays on jpsrealtor.com (Joseph's site)
→ If transaction: Joseph gets 25% referral, John gets deal + 5% data fee
```

### Theme Transitions with Agent Branding

**Current System** (featured properties during theme toggle):
```
User toggles light → dark:
→ Door/garage/curtain animation plays
→ Shows random Obsidian Group property
→ eXp logo + property details
→ 2 second hold
→ Transition completes
```

**Enhanced System** (agent-branded transitions):
```
User toggles theme on Joseph's site:
→ Animation plays
→ Shows Joseph's featured listing (or team/brokerage if he has none)

Display during hold:
┌─────────────────────────────────────────────────┐
│                                                 │
│         [Featured Listing Photo]                │
│                                                 │
│  CENTER: $655,000 | 3 bd 2 ba | 1,850 sf       │
│          123 Desert View Dr, Palm Desert        │
│                                                 │
│  BOTTOM LEFT:              BOTTOM RIGHT:        │
│  Joseph Sardella           [Agent Headshot]     │
│  DRE #02083526            (Transparent PNG)     │
│  📞 (760) 555-1234                              │
│  ✉️ joseph@jpsrealtor.com                       │
│  🌐 jpsrealtor.com                              │
│                                                 │
└─────────────────────────────────────────────────┘

→ Contact info pulled from User.agentProfile
→ Auto-updates if agent changes phone/email
```

**Listing Priority**:
1. Agent's own listings
2. Team listings (if agent has no listings)
3. Brokerage listings (if team has none)

---

## 👥 TEAM STRUCTURE

### Team Hierarchy

**Team Leader** (Data Broker):
```
John Doe (Team Leader):
- Has unique MLS data (SD MLS)
- Manages team members
- Controls team branding
- Manages team blog content
```

**Team Member** (Non-Data Broker):
```
Sarah Smith (Team Member):
- Has duplicate data (CRMLS - already in network via Joe)
- Joins John's team
- Gets own agent website
- Co-branded with team
- Access to team's MLS data + network data
```

### Sarah's Site Structure

```
sarahsmith.chatrealty.io/agent/sarah-smith/{license}/landing

Branding:
- Header: "Sarah Smith Real Estate - John Doe Team"
- Hero: Sarah's photo, bio, testimonials
- Blog: Team blog posts (previews)
- Tools: Chat + Map (Sarah-branded)
```

### Team Content & SEO Flywheel

**Blog Post Flow**:
```
1. Sarah's site shows team blog post previews
   ↓
2. Client clicks blog post
   ↓
3. Redirects to: johndoeteam.chatrealty.io/blog/article-slug?ref=sarah-smith
   ↓
4. Full article on team site (team branding)
   ↓
5. Client clicks "See Listings" or "Start Searching"
   ↓
6. Redirects back to: sarahsmith.chatrealty.io/?source=team-blog&article=article-slug
   ↓
7. Sarah's chat/map opens
   ↓
8. Sarah gets lead attribution
```

**SEO Benefits**:
- Team creates content (scale, quality)
- Content lives on team domain (team SEO)
- Leads flow back to individual agents (attribution)
- Agents benefit without creating content

---

## 🤝 AGENT MATCHING & RELATIONSHIPS

### Swipe Matching System

**Location**: chatrealty.io/find-agent

**User Experience** (Tinder-style):
```
Agent Card Shows:
- Headshot
- Name + Tagline
- Coverage area (map)
- Stats (years exp, sales volume, rating)
- Specialties
- Quick bio (2-3 sentences)
- [Swipe Left] [Swipe Right]
```

**Match Flow**:
```
1. Client swipes right on Agent A
   ↓
2. Instantly connected (no agent approval needed)
   ↓
3. Swipe feature LOCKED (can't swipe other agents)
   ↓
4. Client gets full platform access while waiting
   ↓
5. Agent A notified (24 hour response window)
   ↓
6. Agent A options:
   a) Accept → Start working together
   b) Decline + Handoff → "Work with Agent B" (5% handoff fee)
   c) Decline without handoff → Swipe unlocks
   ↓
7. If no response in 24 hours:
   → Swipe auto-unlocks
   → Client can match with others
   → Agent A lost the lead
```

**Handoff Process**:
```
Agent A (at capacity):
1. Messages Agent B: "Can you take client in Palm Desert?"
2. Agent B responds: "Yes, available" OR "No, booked"
3. If yes → Agent A introduces client to Agent B via platform
4. Agent A earns 5% handoff fee
5. Agent B MUST accept (already committed)
6. Prevents handoff chains
```

**Fees**:
- ChatRealty swipe match: **15% referral fee**
- Agent handoff: **5% to referring agent**
- Direct agent site visit: **0% (no ChatRealty fee)**

### User-Agent Relationship Tracking

**Attribution Hierarchy**:
```
1. User account (source of truth):
   User.agentRelationship = "joseph-sardella-id"

2. Cookie (fallback for anonymous):
   referring_agent = "joseph-sardella-id"

3. URL parameter (temporary):
   ?ref=joseph-sardella
```

**Relationship Lock**:
```
Once User.agentRelationship is set:
→ Always branded to that agent (across all sites)
→ Expires with representation agreement (30 days)
→ Can be changed:
   - Agreement expires → Choose new agent
   - User manually switches agents
   - Agent declines/hands off
```

**Multi-Site Behavior**:
```
Client chooses Sarah as their agent:
→ User.agentRelationship = "sarah-smith-id"

Later, client visits Alex's site (alexphoenix.chatrealty.io):
→ Detects existing relationship
→ Full platform access (not redirected)
→ Banner: "You're working with Sarah Smith. Phoenix listings from Alex Johnson."
→ If client searches Phoenix properties:
   - Stay on Alex's site (normal browsing)
   - No relationship change
   - Sarah still their agent
   - If deal happens: Sarah gets referral, Alex gets data fee
```

---

## 🔐 FEATURE GATING & LIMITS

### Anonymous Tier (No Login)

**Limits**:
- 15 minute browsing session OR
- Limited page clicks/queries (e.g., 20 actions)
- Daily reset

**Access**:
❌ No AI chat
❌ Can't save favorites
❌ Can't view full listing details
✅ Can view map with pins
✅ Can see basic listing info (price, beds/baths)

**Purpose**: Product teaser, drive account creation

### Free Tier (Logged In)

**Limits**:
- Unlimited browsing time
- 3-5 AI queries per day
- 10 saved favorites max
- Limited listing detail views

**Access**:
✅ Basic AI chat (simple searches)
✅ Save limited favorites
✅ View listings
❌ No advanced AI tools (comps, cashflow, appreciation)
❌ No offer submission
❌ No showing scheduling

**Purpose**: Nurture leads, encourage upgrades

### Pro Tier ($10/month)

**Limits**:
- Unlimited browsing
- 20-30 AI queries per day
- Unlimited favorites
- Full listing access

**Access**:
✅ More AI queries
✅ Market research tools
✅ Advanced filters
✅ Property alerts
⚡ Limited advanced AI (5 per day):
   - Run comps
   - Calculate cashflow
   - Appreciation analysis

**Purpose**: Active searchers, serious buyers

### Ultimate Tier ($20/month)

**Access**:
✅ Unlimited everything
✅ Unlimited AI queries
✅ Unlimited advanced tools:
   - Comps
   - Cashflow calculators
   - Appreciation analysis
   - Draft offers
✅ Schedule showings
✅ Submit offers
✅ Priority support

**Purpose**: Power users, ready to transact

### Investor Tier ($99/month)

**Access**:
✅ Everything in Ultimate
✅ Advanced financial tools:
   - Bulk cashflow analysis
   - Portfolio comparison
   - ROI modeling
   - Cap rate calculators
   - Market trend forecasting
   - Multi-property analysis
✅ Export data (CSV/Excel)
✅ API access (future)

**Purpose**: Professional investors, portfolio builders

### Representation Agreement Benefits

**Independent of Subscription Tiers**:
```
Free tier + Rep agreement:
✅ Schedule showings with agent
✅ Submit offers through agent
✅ Direct agent messaging
✅ Personalized market alerts
❌ Still limited AI queries (Free tier limit)

Ultimate tier + Rep agreement:
✅ Everything in Ultimate
✅ PLUS agent features above
✅ Unlimited AI + agent access
```

**Best combination**: Ultimate tier + Rep agreement = Full platform access

---

## 🎨 AGENT CUSTOMIZATION

### Asset Types

**Photos**:
- Headshot (profile photo)
- Hero photo (landing page header)
- Team photo
- Office photo
- Gallery photos (lifestyle/community)

**Custom Backgrounds** (4 variations):
- Light mode - Desktop
- Light mode - Mobile
- Dark mode - Desktop
- Dark mode - Mobile

**Media**:
- Video intro (YouTube/Vimeo URL or upload)
- Custom logo (replaces eXp logo)

**Content**:
- Bio (Markdown supported)
- Tagline
- Testimonials
- Custom blog posts
- Stats/achievements

**Branding**:
- Social media links (all platforms)
- Contact information
- Service areas
- Specialties

### Theme System

**MVP**: Light/Dark mode toggle (existing system)
```
Agent gets:
- Light mode (existing lightgradient)
- Dark mode (existing blackspace)
- Can upload 4 custom backgrounds
- Theme transitions show their listings
```

**V2**: Manual color customization
```
Agent dashboard:
- Primary color picker (buttons, accents)
- Secondary color picker
- System auto-generates complementary palette
- Applies to all UI elements
```

**Custom Backgrounds**:
```
Replace default backgrounds:
- SpaticalBackground (starfield) → Agent's dark mode background
- Light gradient → Agent's light mode background

Responsive:
- Desktop: High-res images
- Mobile: Optimized/cropped versions
```

---

## 📊 USER MODEL EXTENSIONS

### Core Agent Profile Schema

```typescript
interface IUser {
  // ... existing fields ...

  // AGENT PROFILE & ASSETS
  agentProfile?: {

    // Photos & Media
    headshot?: string;              // Cloudinary URL - Professional headshot
    heroPhoto?: string;             // Cloudinary URL - Hero section background
    teamPhoto?: string;             // Cloudinary URL - Team photo
    officePhoto?: string;           // Cloudinary URL - Office photo
    galleryPhotos?: string[];       // Cloudinary URLs - Additional photos
    videoIntro?: string;            // YouTube/Vimeo URL or Cloudinary

    // Custom Backgrounds (4 variations)
    customBackgrounds?: {
      lightDesktop?: string;        // Cloudinary URL
      lightMobile?: string;         // Cloudinary URL
      darkDesktop?: string;         // Cloudinary URL
      darkMobile?: string;          // Cloudinary URL
    };

    // Branding
    tagline?: string;               // "Born Here. Raised Here. Selling Here."
    bio?: string;                   // Long-form bio (Markdown supported)
    specialties?: string[];         // ["Luxury Homes", "Golf Communities"]
    servingAreas?: string[];        // ["Palm Desert", "Indian Wells"]
    customLogo?: string;            // Cloudinary URL (replaces eXp logo)

    // Social Media
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      twitter?: string;
      tiktok?: string;
    };

    // Stats & Achievements
    stats?: {
      yearsExperience?: number;
      salesVolume?: number;          // Total career sales
      transactionsCompleted?: number;
      averageRating?: number;        // 0-5 stars
      reviewCount?: number;
    };

    // Contact Info (used in theme transitions)
    contactInfo?: {
      phone?: string;                // Primary phone
      email?: string;                // Primary email
      website?: string;              // Custom domain
      officeAddress?: string;
    };

    // Testimonials
    testimonials?: Array<{
      id: string;
      clientName: string;
      clientInitials?: string;       // "J.D." for privacy
      rating: number;                // 1-5 stars
      text: string;
      propertyType?: string;         // "Luxury home in Indian Wells"
      date: Date;
      featured: boolean;             // Show on landing page?
      approved: boolean;             // Admin review
    }>;

    // MLS Data Sources (Data Broker)
    mlsDataSources?: Array<{
      name: string;                  // "GPS (Greater Palm Springs)"
      mlsId: string;                 // "GPS-001"
      coverage: {
        type: "MultiPolygon";        // GeoJSON
        coordinates: any[][];
        cities: string[];
        counties: string[];
        states: string[];
      };
      listingCount: number;
      lastSyncedAt: Date;
      status: "active" | "inactive" | "pending";
      dataShareAgreementSigned: boolean;
      dataShareStartDate: Date;
    }>;

    // Licensed Territories
    licenses: Array<{
      state: string;                 // "CA", "AZ"
      licenseNumber: string;
      status: "active" | "inactive" | "expired";
      issueDate?: Date;
      expiresAt?: Date;
      verified: boolean;             // Manual verification by admin
    }>;

    // Team Relationships
    teamId?: ObjectId;               // Reference to Team model
    isTeamLeader: boolean;
    teamRole?: string;               // "Leader", "Associate", "ISA"

    // Landing Page Settings
    landingPageSettings?: {
      enabled: boolean;              // Is landing page active?
      slug: string;                  // URL slug (e.g., "joseph-sardella")
      customDomain?: string;         // "jpsrealtor.com"
      domainVerified: boolean;
      metaTitle?: string;            // SEO title override
      metaDescription?: string;      // SEO description
      showChatWidget?: boolean;      // Enable chat on landing
      ctaPrimary?: string;           // "Start Searching" | custom
      ctaSecondary?: string;         // "View Listings" | custom
    };

    // Subscription & Billing
    subscriptionTier?: "free" | "pro" | "ultimate" | "investor";
    subscriptionStatus?: "active" | "cancelled" | "past_due";
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    stripeCustomerId?: string;

    // Agent-Sponsored Clients (track who they're paying for)
    sponsoredClients?: Array<{
      userId: ObjectId;
      tier: "pro" | "ultimate" | "investor";
      startDate: Date;
      monthsSponsored: number;
      totalOwed: number;             // Accrued fees
      lastBilledAt?: Date;
    }>;
  };

  // CLIENT-SIDE FIELDS

  // Agent Relationship
  agentRelationship?: ObjectId;      // Which agent user is working with
  representationAgreement?: {
    agentId: ObjectId;
    signedAt: Date;
    expiresAt: Date;
    status: "active" | "expired" | "cancelled";
    renewalCount: number;            // Track how many times renewed
  };

  // Subscription
  subscriptionTier?: "free" | "pro" | "ultimate" | "investor";
  subscriptionStatus?: "active" | "cancelled" | "past_due" | "sponsored";
  sponsoredBy?: ObjectId;            // Agent ID if agent is paying

  // Usage Tracking (for limits)
  usageLimits?: {
    aiQueriesUsedToday: number;
    lastResetAt: Date;
    browsingMinutesUsedToday: number;
    actionsUsedToday: number;        // Clicks/page views
  };
}
```

### Listing Model Extension

```typescript
interface IListing {
  // ... existing fields ...

  // Data Attribution
  dataSource: {
    agentId: ObjectId;               // Data broker who contributed this MLS
    mlsName: string;                 // "GPS", "CRMLS", "San Diego MLS"
    mlsId: string;
    contributedAt: Date;
  };

  // Tenant/Agent Association (for multi-tenancy)
  tenantId?: ObjectId;               // Optional - for future full multi-tenant
}
```

### New Models Needed

**Team Model**:
```typescript
interface ITeam {
  _id: ObjectId;
  name: string;                      // "John Doe Real Estate Team"
  slug: string;                      // "john-doe-team"
  leaderId: ObjectId;                // Team leader agent ID
  memberIds: ObjectId[];             // Team member agent IDs

  // Team Branding
  logo?: string;
  heroPhoto?: string;
  bio?: string;

  // Team Blog (shared content)
  blogPosts: ObjectId[];             // References to Article model

  createdAt: Date;
  updatedAt: Date;
}
```

**Transaction Model** (track fees):
```typescript
interface ITransaction {
  _id: ObjectId;

  // Property & Client
  listingKey: string;
  buyerUserId: ObjectId;
  sellerUserId?: ObjectId;

  // Agents Involved
  closingAgentId: ObjectId;          // Agent who closed the deal
  referringAgentId?: ObjectId;       // Agent who referred (if applicable)
  dataSourceAgentId: ObjectId;       // Agent who provided MLS data
  handoffAgentId?: ObjectId;         // Agent who handed off (if applicable)

  // Commission Breakdown
  grossCommission: number;

  fees: {
    chatRealtySwipeFee?: number;     // 15% if from swipe match
    referralFee?: number;            // 25% if out-of-state
    dataFee: number;                 // 5% to data broker
    handoffFee?: number;             // 5% if handed off
    companyFee: number;              // Base company % split
  };

  netToClosingAgent: number;

  // Status
  status: "pending" | "closed" | "cancelled";
  closingDate?: Date;

  // Billing
  feesCollected: boolean;
  paidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

**AgentMatch Model** (swipe matching):
```typescript
interface IAgentMatch {
  _id: ObjectId;

  userId: ObjectId;                  // Client
  agentId: ObjectId;                 // Agent they matched with

  // Match Details
  source: "swipe" | "direct_site" | "handoff";
  matchedAt: Date;

  // Agent Response
  agentStatus: "pending" | "accepted" | "declined" | "timeout";
  respondedAt?: Date;
  declineReason?: string;
  handoffToAgentId?: ObjectId;       // If declined with handoff

  // Fees
  chatRealtyFee?: number;            // 15% if from swipe
  handoffFee?: number;               // 5% if handed off

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🚀 IMPLEMENTATION STRATEGY

### Current State

**jpsrealtor.com**:
- Live production site
- Joseph Sardella's personal brand
- Has all core features:
  - AI chat (Groq)
  - Map with 32K listings (GPS + CRMLS)
  - CHAP unified experience
  - Insights/articles
  - CRM
  - Theme system
  - PWA

### Phase 1: Build Multi-Tenant Architecture (On jpsrealtor.com)

**DO NOT clone the site. Build multi-tenancy INTO current codebase.**

```
Current: jpsrealtor.com (standalone)
         ↓
Phase 1: jpsrealtor.com (multi-tenant ready)
         - Add tenantId fields to models
         - Add agent profile system
         - Add asset upload
         - Add landing page transformation
         - Joseph becomes "Tenant #1"
         ↓
Phase 2: Rebrand domain to chatrealty.io
         - DNS change only
         - jpsrealtor.com → chatrealty.io
         ↓
Phase 3: Map jpsrealtor.com to tenant
         - jpsrealtor.com → chatrealty.io/agent/joseph-sardella/{license}/landing
         - Custom domain mapping
         ↓
Phase 4: Recruit Agent #2
         - Test multi-tenancy with real second agent
         - Validate fee structures
         - Refine onboarding
```

**No cloning, no migration, just DNS changes.**

### Build Order (Phase 1)

**Week 1-2: Data Layer**
1. Extend User model with agentProfile schema
2. Create Team model
3. Create Transaction model
4. Create AgentMatch model
5. Add database indexes
6. Create migration scripts

**Week 3-4: Asset Upload System**
7. Cloudinary integration
8. Photo upload API endpoints
9. Asset management utilities
10. Image optimization/transformation

**Week 5-6: Agent Dashboard**
11. Profile management UI
12. Photo uploader components
13. Bio/content editors
14. Testimonial CRUD
15. Stats form
16. MLS data source form
17. License verification form

**Week 7-8: Landing Page Transformation**
18. Transform insights page → agent landing page
19. Hero section (agent profile)
20. About section
21. Stats showcase
22. Testimonials carousel
23. Tools demo section
24. CTA sections

**Week 9-10: Custom Backgrounds & Theme System**
25. Background upload (4 variations)
26. Theme context updates (use custom backgrounds)
27. Responsive background loading
28. Theme transition updates (agent branding)
29. Featured listing logic (agent → team → brokerage)

**Week 11-12: Subscription & Feature Gates**
30. Subscription tier system
31. Usage tracking middleware
32. Feature gate components
33. Upgrade modals/CTAs
34. Stripe integration
35. Billing dashboard

**Week 13-14: Representation Agreements**
36. Agreement signing flow
37. E-signature integration (DocuSign/HelloSign)
38. Agreement expiration tracking
39. Renewal notifications
40. Agreement-locked features

**Week 15-16: Agent Matching System**
41. Swipe UI (Tinder-style)
42. Agent card components
43. Match logic
44. Handoff workflow
45. Response time tracking
46. Notification system

**Week 17-18: Team Features**
47. Team blog system
48. Attribution tracking (cookies → accounts)
49. Team content routing
50. SEO flywheel implementation

**Week 19-20: Territory & Fee Tracking**
51. Territory detection (GeoJSON queries)
52. Toast notifications
53. Banner components
54. Data source attribution
55. Commission calculation logic
56. Transaction recording

**Week 21-22: Polish & Testing**
57. Mobile optimization
58. Performance tuning
59. SEO metadata
60. Analytics integration
61. Bug fixes
62. Documentation

**Week 23-24: Launch Preparation**
63. Admin tools
64. Agent onboarding flow
65. Support documentation
66. Marketing materials
67. Beta testing with Joseph
68. Soft launch

---

## 📋 SUCCESS METRICS

### Platform Health
- Number of data-share agents
- MLS coverage (cities/states)
- Total listings in network
- Active users per agent
- Conversion rate (anonymous → registered → represented)

### Revenue Metrics
- MRR (Monthly Recurring Revenue from subscriptions)
- Agent fees collected
- Referral fees generated
- Average revenue per agent
- Customer acquisition cost

### User Engagement
- Daily active users
- AI queries per user
- Time on site
- Favorite/save rate
- Representation agreement conversion rate

### Agent Metrics
- Leads per agent
- Response time (swipe matches)
- Data fee income per agent
- Referral fee income per agent
- Agent retention rate

---

## 🎯 COMPETITIVE ADVANTAGES

### vs Zillow
- **Agent-first**: Platform helps agents, doesn't compete
- **Better data**: Agents contribute, everyone benefits
- **Lower costs**: No lead buying, cooperative model
- **AI tools**: Advanced search, not just filters

### vs Traditional IDX
- **Network effects**: More agents = more data = better product
- **Revenue share**: Passive income from data/referrals
- **Modern UX**: AI chat, not outdated search forms
- **Mobile-first**: PWA, not clunky desktop sites

### vs Other Agent Platforms
- **Unique data model**: First-come data broker rights
- **Automatic referrals**: Built into platform, not manual
- **Subscription revenue**: Multiple streams, not just leads
- **Social matching**: Tinder for agents = better fit

---

## ⚠️ RISKS & MITIGATIONS

### Risk 1: Agent Recruitment
**Problem**: Hard to get first 10-20 agents (chicken-egg)
**Mitigation**:
- Start with Joseph (proof of concept)
- Target eXp agents (familiar with rev-share model)
- Offer founding agent benefits (better fee structure)
- Focus on underserved markets first

### Risk 2: Data Quality
**Problem**: Agents might contribute bad/stale MLS data
**Mitigation**:
- Automated data freshness checks
- Agent performance dashboards
- Data quality requirements in agreement
- Remove agents who don't maintain data

### Risk 3: Territory Conflicts
**Problem**: Agents fighting over same territory
**Mitigation**:
- First-come, first-served data broker rights
- Clear GeoJSON boundaries
- Admin arbitration process
- Consider exclusive territories in some markets

### Risk 4: Fee Complexity
**Problem**: Stacking fees might be too expensive
**Mitigation**:
- Cap total fees at 30-35% (protect closing agent)
- Make fee structure transparent
- Show agents their potential income
- Simplify where possible

### Risk 5: Tech Complexity
**Problem**: Multi-tenancy is hard to build/maintain
**Mitigation**:
- Start simple (Joseph only)
- Add tenancy incrementally
- Extensive testing before Agent #2
- Good documentation
- Hire experienced developers

---

## 📚 GLOSSARY

**Data Broker**: Agent who first contributes a specific MLS source to the network. Earns 5% on all deals using that data.

**Data Fee**: 5% commission paid to the data broker when their MLS data is used in a transaction.

**Referral Fee**: 25% commission paid to an agent who refers a client to another agent (out-of-state).

**Handoff Fee**: 5% commission paid to an agent who introduces a client to another agent (same state, at capacity).

**ChatRealty Swipe Fee**: 15% referral fee paid to ChatRealty when a client finds an agent via the swipe matching feature.

**Representation Agreement**: 30-day contract between client and agent that unlocks premium features.

**Data-Share Partner**: Agent who joins the company, contributes MLS data, and participates in revenue sharing.

**Tenant**: An agent's instance of the platform (either subdomain or custom domain).

**Multi-Tenancy**: Architecture that allows multiple agents to have separate branded sites on the same platform.

**CHAP**: Chat + Map unified experience (core product differentiator).

---

**Last Updated**: March 16, 2026
**Version**: 1.0
**Next Review**: After Phase 1 Week 12
