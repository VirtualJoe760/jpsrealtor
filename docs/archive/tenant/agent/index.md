# Agent Profile System

**Part of the ChatRealty.io Multi-Tenant Platform**

> **Related Documentation:**
> - [Multi-Tenant Architecture](../../multi-tenant/index.md) - Platform overview
> - [Agent Settings Guide](./settings.md) - Detailed UI/UX documentation

## Overview

The Agent Profile system enables real estate agents to create personalized landing pages within the ChatRealty.io multi-tenant platform. Each agent gets their own branded website with custom content, photos, social media links, and SEO optimization.

## Vision

- **jpsrealtor.com** → Joseph Sardella's agent site (Tenant #1)
- **agent2.chatrealty.io** → Another agent's subdomain
- **customdomain.com** → Premium agent's custom domain

All powered by a single codebase with tenant-aware data isolation.

---

## Data Model

### User Model Extension

All agent profile data is stored in the `User.agentProfile` field:

```typescript
// src/models/User.ts
interface IUser {
  // ... existing fields ...

  agentProfile?: {
    // Photos & Media
    headshot?: string;              // Profile photo (Cloudinary URL)
    heroPhoto?: string;              // Landing page background
    teamPhoto?: string;              // Team group photo
    officePhoto?: string;            // Office/brokerage photo
    galleryPhotos?: string[];        // Additional photos
    videoIntro?: string;             // Video introduction

    // Custom Backgrounds (4 variations)
    customBackgrounds?: {
      lightDesktop?: string;
      lightMobile?: string;
      darkDesktop?: string;
      darkMobile?: string;
    };

    // Landing Page Content
    headline?: string;               // e.g., "Your Trusted Real Estate Partner"
    tagline?: string;                // e.g., "Serving Orange County Since 2010"
    valuePropositions?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    testimonials?: Array<{
      clientName: string;
      clientPhoto?: string;
      rating: number;                // 1-5 stars
      text: string;
      date: Date;
      propertyAddress?: string;
    }>;
    stats?: Array<{
      label: string;                 // e.g., "Homes Sold"
      value: string;                 // e.g., "500+"
      icon?: string;
    }>;

    // Social Media Links
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      youtube?: string;
      tiktok?: string;
    };

    // Business Info
    businessHours?: Array<{
      day: string;
      open: string;
      close: string;
      closed: boolean;
    }>;
    officeAddress?: string;
    officePhone?: string;
    cellPhone?: string;

    // Service Areas & Specializations
    serviceAreas?: Array<{
      name: string;
      type: "city" | "county" | "zip" | "custom";
      geoJson?: any;                 // GeoJSON polygon
    }>;
    specializations?: string[];      // ["Luxury Homes", "First-Time Buyers"]
    certifications?: Array<{
      name: string;
      issuedBy: string;
      year: number;
      logoUrl?: string;
    }>;

    // MLS Data Sources (Data Broker)
    mlsDataSources?: Array<{
      name: string;                  // e.g., "CRMLS"
      mlsId: string;
      coverage: {
        type: "MultiPolygon";
        coordinates: any[][];
        cities: string[];
        counties: string[];
        states: string[];
      };
      listingCount: number;
      lastSyncedAt: Date;
      status: "active" | "inactive" | "pending";
      dataBrokerRights: boolean;     // First-come gets 5% passive income
    }>;

    // Licensed Territories
    licenses: Array<{
      state: string;
      licenseNumber: string;
      status: "active" | "inactive" | "expired";
      expiresAt?: Date;
    }>;

    // Domain & Branding
    customDomain?: string;           // e.g., "josephsardella.com"
    subdomain?: string;              // e.g., "joseph" (becomes joseph.chatrealty.io)
    brandColors?: {
      primary?: string;              // Hex color
      secondary?: string;
      accent?: string;
    };

    // SEO & Marketing
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };
}
```

**Key Features:**
- All fields are **optional** (no required data)
- Deep nested objects for organization
- Cloudinary URLs for all media assets
- GeoJSON support for territory mapping
- Multi-language support ready (arrays)

---

## API Endpoints

### GET `/api/user/profile`

Fetch the current user's profile including `agentProfile` data.

**Response:**
```json
{
  "profile": {
    "name": "Joseph Sardella",
    "email": "josephsardella@gmail.com",
    "phone": "760-333-3676",
    "image": "https://lh3.googleusercontent.com/...",
    "brokerageName": "eXp Realty",
    "licenseNumber": "02106916",
    "profileDescription": "Your trusted Coachella Valley Realtor.",
    "team": { "name": "Default Team", "description": null },
    "isTeamLeader": false,
    "agentProfile": {
      "headline": "Your Trusted Real Estate Partner",
      "tagline": "Serving Coachella Valley Since 2010",
      "socialMedia": {
        "facebook": "https://facebook.com/josephsardella",
        "instagram": "https://instagram.com/josephsardella",
        "linkedin": "https://linkedin.com/in/josephsardella"
      }
    }
  }
}
```

### PUT `/api/user/profile`

Update user profile with deep merge for `agentProfile`.

**Request Body:**
```json
{
  "name": "Joseph Sardella",
  "phone": "760-333-3676",
  "agentProfile": {
    "headline": "Your Trusted Real Estate Partner",
    "socialMedia": {
      "facebook": "https://facebook.com/josephsardella"
    }
  }
}
```

**Behavior:**
- Deep merges nested objects (socialMedia, customBackgrounds, brandColors)
- Preserves existing data not included in request
- Updates only fields provided
- Returns full updated profile

**Example Deep Merge:**
```javascript
// Existing data in DB:
{
  agentProfile: {
    headline: "Old Headline",
    socialMedia: {
      facebook: "old-url",
      instagram: "existing-instagram"
    }
  }
}

// Request:
{
  agentProfile: {
    headline: "New Headline",
    socialMedia: {
      facebook: "new-url"
    }
  }
}

// Result after save:
{
  agentProfile: {
    headline: "New Headline",        // ✅ Updated
    socialMedia: {
      facebook: "new-url",           // ✅ Updated
      instagram: "existing-instagram" // ✅ Preserved!
    }
  }
}
```

---

## UI/UX Flow

### Agent Dashboard (`/agent/dashboard`)

**Current Implementation:**

1. **Overview Tab** (default view)
   - Profile card with photo, name, contact info
   - Team affiliation display
   - Stats cards (Active Clients, Team Members, etc.)

2. **Edit Mode** (click Settings icon)
   - **Basic Info Section:**
     - Full Name
     - Phone Number
     - Brokerage Name
     - License Number
     - Bio / About

   - **Landing Page Content Section:** _(NEW)_
     - Headline
     - Tagline

   - **Social Media Links Section:** _(NEW)_
     - Facebook (with icon)
     - Instagram (with icon)
     - LinkedIn (with icon)
     - YouTube (with icon)

3. **Save Changes**
   - Sends all data to `/api/user/profile`
   - Shows success toast
   - Exits edit mode
   - Updates local state

**User Experience:**
- Single click to edit (Settings icon)
- All fields in one scrollable form
- Visual separation with borders
- Icon indicators for clarity
- Placeholder text for guidance
- Real-time validation (future)
- Photo upload with progress indicators

---

## Current Status

### ✅ Implemented (Phase 1)

**Data Layer:**
- User model extended with full `agentProfile` schema
- API endpoints (GET/PUT) with deep merge support
- Database indexes for performance
- TypeScript types

**UI Layer:**
- Basic info fields (name, phone, brokerage, license, bio)
- Profile photo upload (existing headshot)
- Landing page content (headline, tagline)
- Social media links (Facebook, Instagram, LinkedIn, YouTube)
- Edit mode integration

**Infrastructure:**
- Cloudinary integration for photo uploads
- Toast notifications for feedback
- Loading states during save
- Error handling

### 🚧 Planned (Future Phases)

**Phase 2: Extended Media**
- Hero photo upload (landing page background)
- Team photo upload
- Office photo upload
- Gallery photos (multiple uploads)
- Video introduction upload

**Phase 3: Custom Backgrounds**
- Light theme desktop background
- Light theme mobile background
- Dark theme desktop background
- Dark theme mobile background

**Phase 4: Advanced Content**
- Value propositions builder (array management)
- Testimonials manager (add/edit/delete)
- Stats builder (custom metrics)
- Business hours editor (weekly schedule)
- Certifications list

**Phase 5: Territory & Specialization**
- Service areas with map picker
- GeoJSON territory boundaries
- Specializations multi-select
- MLS data source configuration

**Phase 6: Branding & SEO**
- Subdomain management (e.g., joseph.chatrealty.io)
- Custom domain setup (e.g., josephsardella.com)
- Brand color picker (primary, secondary, accent)
- SEO meta fields (title, description, keywords)

---

## Multi-Tenant Integration

### Tenant Identification

**Subdomain Strategy:**
```
joseph.chatrealty.io → Query User where agentProfile.subdomain = "joseph"
```

**Custom Domain Strategy:**
```
josephsardella.com → Query User where agentProfile.customDomain = "josephsardella.com"
```

**Data Isolation:**
- Each agent's `agentProfile` is isolated within their User document
- No cross-tenant data leakage
- Middleware checks domain → finds agent → renders their content

### Landing Page Rendering

**Planned Flow:**
1. User visits `joseph.chatrealty.io`
2. Middleware extracts subdomain: `"joseph"`
3. Query: `User.findOne({ 'agentProfile.subdomain': 'joseph' })`
4. Render landing page with agent's:
   - Headline, tagline
   - Photos (headshot, hero, gallery)
   - Social media links
   - Testimonials, stats
   - Custom backgrounds (theme-aware)
   - SEO meta tags

**Current State:**
- jpsrealtor.com serves Joseph's content (hardcoded)
- Multi-tenant routing NOT YET implemented
- Data layer is ready

---

## Database Queries

### Find Agent by Subdomain
```javascript
const agent = await User.findOne({
  'agentProfile.subdomain': 'joseph',
  roles: 'realEstateAgent'
}).select('agentProfile name email phone brokerageName');
```

### Find Agent by Custom Domain
```javascript
const agent = await User.findOne({
  'agentProfile.customDomain': 'josephsardella.com',
  roles: 'realEstateAgent'
}).select('agentProfile name email phone brokerageName');
```

### Find All Data Brokers
```javascript
const dataBrokers = await User.find({
  'agentProfile.mlsDataSources.dataBrokerRights': true,
  roles: 'realEstateAgent'
}).select('name agentProfile.mlsDataSources');
```

### Find Agents in Territory (GeoJSON)
```javascript
// Find agents serving a specific point (lat/lng)
const agents = await User.find({
  'agentProfile.serviceAreas.geoJson': {
    $geoIntersects: {
      $geometry: {
        type: 'Point',
        coordinates: [lng, lat] // [longitude, latitude]
      }
    }
  },
  roles: 'realEstateAgent'
});
```

---

## Security & Validation

### Field Validation

**Required for Agents:**
- None (all optional to start)

**Recommended for Public Landing Page:**
- `name` (inherited from User.name)
- `agentProfile.headshot` (professional appearance)
- `agentProfile.headline` (clear value proposition)
- `agentProfile.socialMedia` (at least one platform)

### Data Sanitization

**Inputs:**
- URLs validated (starts with http:// or https://)
- HTML stripped from text fields (XSS prevention)
- Image URLs verified (Cloudinary domain only)
- GeoJSON validated (proper structure)

**File Uploads:**
- Max size: 5MB per image
- Allowed types: image/* (jpg, png, webp)
- Cloudinary folder: `agent-profile/`
- Auto-optimization enabled

---

## Performance Considerations

### Database Indexes

```javascript
// User model indexes for multi-tenant queries
UserSchema.index({ "agentProfile.subdomain": 1 });
UserSchema.index({ "agentProfile.customDomain": 1 });
UserSchema.index({ "agentProfile.mlsDataSources.dataBrokerRights": 1 });
```

**Query Performance:**
- Subdomain lookup: ~5ms (indexed)
- Custom domain lookup: ~5ms (indexed)
- Full profile fetch: ~15ms (includes team population)

### Caching Strategy (Future)

**Redis Cache:**
```javascript
// Cache agent profiles for 5 minutes
const cacheKey = `agent:subdomain:${subdomain}`;
const cached = await redis.get(cacheKey);

if (cached) return JSON.parse(cached);

const agent = await User.findOne({ 'agentProfile.subdomain': subdomain });
await redis.setex(cacheKey, 300, JSON.stringify(agent));
return agent;
```

**Cache Invalidation:**
- On profile update (`PUT /api/user/profile`)
- On photo upload
- Manual clear via admin panel

---

## Example: Joseph Sardella's Profile

**Current Data (from database query):**

```json
{
  "name": "Joseph Sardella",
  "email": "josephsardella@gmail.com",
  "phone": "760-333-3676",
  "image": "https://lh3.googleusercontent.com/a/ACg8ocJK6DSpYs-xMitc0KaJUpjXFBhc1NOelkPZJzLc11EMMqZM2a5a=s96-c",
  "brokerageName": "eXp Realty",
  "licenseNumber": "02106916",
  "profileDescription": "Your trusted Coachella Valley Realtor.",
  "roles": ["endUser", "admin", "realEstateAgent"],
  "isTeamLeader": false,
  "team": "6959ae69bf636b80f576a5ed",
  "agentProfile": null
}
```

**After Filling Out Settings:**

```json
{
  "agentProfile": {
    "headline": "Your Trusted Coachella Valley Realtor",
    "tagline": "Helping You Find Your Dream Home Since 2010",
    "headshot": "https://res.cloudinary.com/.../joseph-headshot.jpg",
    "heroPhoto": "https://res.cloudinary.com/.../coachella-valley-sunset.jpg",
    "socialMedia": {
      "facebook": "https://facebook.com/josephsardella",
      "instagram": "https://instagram.com/josephsardella",
      "linkedin": "https://linkedin.com/in/josephsardella",
      "youtube": "https://youtube.com/@josephsardella"
    },
    "stats": [
      { "label": "Homes Sold", "value": "500+", "icon": "home" },
      { "label": "Years Experience", "value": "15", "icon": "calendar" },
      { "label": "Happy Clients", "value": "450", "icon": "users" }
    ],
    "specializations": [
      "Luxury Homes",
      "Desert Properties",
      "Golf Course Communities"
    ],
    "subdomain": "joseph",
    "metaTitle": "Joseph Sardella - Coachella Valley Real Estate Expert",
    "metaDescription": "Experienced realtor specializing in luxury homes and golf course communities in Coachella Valley. Contact Joseph Sardella today!"
  }
}
```

---

## Migration Path

### From jpsrealtor.com to ChatRealty.io

**Current State:**
- jpsrealtor.com is a single-tenant site (Joseph only)
- All content is hardcoded in components
- No dynamic agent lookup

**Phase 1: Data Layer** ✅ COMPLETE
- User model extended with agentProfile
- API endpoints created
- Agent dashboard UI built
- Joseph can now manage his profile

**Phase 2: Multi-Tenant Routing** (Next)
1. Add middleware to detect subdomain/custom domain
2. Query agent based on domain
3. Pass agent data to pages via props
4. Render dynamic content

**Phase 3: DNS Migration**
1. Point joseph.chatrealty.io to production server
2. Test Joseph's agent profile loads correctly
3. Add other agents (agent2.chatrealty.io, etc.)
4. Eventually rebrand main site to ChatRealty.io
5. jpsrealtor.com redirects to joseph.chatrealty.io

---

## Related Features

### Fee Tracking
- When agent closes deal, track in [Transaction model](../../multi-tenant/index.md#transaction-model)
- Data broker fees (5%) calculated if using another agent's MLS data
- Tied to `agentProfile.mlsDataSources.dataBrokerRights`

### Agent Matching
- Tinder-style swipe to match clients with agents
- Uses `agentProfile.specializations` for matching
- Uses `agentProfile.serviceAreas` for territory detection
- See [AgentMatch model](../../multi-tenant/index.md#agentmatch-model)

### Subscription Management
- Agent subscription tiers (Free, Starter, Professional, Enterprise)
- Controls access to features:
  - Free: Subdomain only, 10 photos
  - Professional: Custom domain, 200 photos, analytics
  - Enterprise: Unlimited everything, API access
- See [AgentSubscription model](../../multi-tenant/index.md#agentsubscription-model)

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Request                          │
│  joseph.chatrealty.io or josephsardella.com            │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Middleware (Future)                        │
│  - Extract subdomain or custom domain                   │
│  - Query User.agentProfile                              │
│  - Return 404 if not found                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                Landing Page Component                   │
│  - Receives agent data as props                         │
│  - Renders headline, tagline, photos                    │
│  - Shows social links, testimonials, stats              │
│  - Uses custom backgrounds (theme-aware)                │
│  - Applies brand colors                                 │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                 User Interaction                        │
│  - Browse properties (CHAP interface)                   │
│  - Contact agent (form submission)                      │
│  - Sign representation agreement                        │
│  - Swipe on listings (agent match)                      │
└─────────────────────────────────────────────────────────┘
```

---

## File References

**Data Models:**
- `src/models/User.ts` - User model with agentProfile schema

**API Routes:**
- `src/app/api/user/profile/route.ts` - GET/PUT endpoints

**UI Components:**
- `src/app/agent/dashboard/page.tsx` - Agent dashboard with settings

**Documentation:**
- `docs/multi-tenant/index.md` - Platform overview
- `docs/tenant/agent/settings.md` - Detailed UI guide (this doc)

---

## Summary

The Agent Profile system provides a comprehensive data structure and UI for agents to build personalized landing pages within the ChatRealty.io multi-tenant platform. Currently in Phase 1 with basic fields implemented, the system is designed to scale to hundreds of agents while maintaining performance and data isolation.

**Next Actions:**
1. Fill out agent profile via `/agent/dashboard`
2. Test data persistence and deep merge behavior
3. Plan Phase 2: Extended media uploads
4. Design multi-tenant routing middleware
