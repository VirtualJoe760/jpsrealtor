# 🏗️ MASTER SYSTEM ARCHITECTURE
**JPSRealtor.com & ChatRealty.io Ecosystem**
**Last Updated:** January 2025
**Version:** 3.0.0 (NextAuth + Custom CRM)

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [Future: Custom CRM/CMS](#future-custom-crmcms)
8. [Deployment Architecture](#deployment-architecture)
9. [External Integrations](#external-integrations)

---

## 🎯 EXECUTIVE SUMMARY

**JPSRealtor.com** is an AI-powered real estate platform with plans to scale into **ChatRealty.io**, a white-label network enabling:
- **AI-driven property discovery**: Groq LLM with natural language search
- **Unified "Chap" experience**: Chat + Map integrated interface
- **Dual MLS integration**: 32,000+ listings from GPS + CRMLS
- **Swipe discovery**: Tinder-style property matching
- **Smart recommendations**: ML-powered property suggestions
- **Custom CRM/CMS**: Building proprietary agent/client management (future)

### Current Deployment

**Primary Site:** JPSRealtor.com (Joseph Sardella, Palm Springs)
- Frontend: https://jpsrealtor.com (Vercel)
- Database: MongoDB Atlas (DigitalOcean NYC3)
- VPS: 147.182.236.138 (DigitalOcean)

**Future Vision:** ChatRealty.io agent network
- Multi-tenant branded frontends
- Shared MLS data pool
- Custom CRM for agent/client management

---

## 🌐 SYSTEM OVERVIEW

### Two-Tier Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: FRONTEND LAYER                       │
│                  (Next.js 16 - App Router)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │        JPSRealtor.com               │                       │
│  │  ┌──────────────────────────────┐   │                       │
│  │  │ NextAuth.js (Auth)           │   │                       │
│  │  │ Next.js API Routes           │   │                       │
│  │  │ Groq AI Chat Integration     │   │                       │
│  │  │ MapLibre + Supercluster      │   │                       │
│  │  └──────────────────────────────┘   │                       │
│  └─────────────────────────────────────┘                       │
│                          │                                      │
│              Direct MongoDB Access (no CMS layer)               │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 2: DATA LAYER                           │
│              (MongoDB Atlas - DigitalOcean)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database: jpsrealtor                                           │
│  ├─ users                    (~500 docs) ← NextAuth managed    │
│  ├─ sessions                 (NextAuth sessions)               │
│  ├─ accounts                 (OAuth providers)                 │
│  ├─ listings                 (11,592 GPS active)               │
│  ├─ crmlsListings            (20,406 CRMLS active)             │
│  ├─ gpsClosedListings        (11,592 GPS sold)                 │
│  ├─ crmlsClosedListings      (30,409 CRMLS sold)               │
│  ├─ photos                   (~40,000 cached photos)           │
│  ├─ cities                   (~50 cities)                      │
│  ├─ subdivisions             (~500 communities)                │
│  ├─ schools                  (~200 schools)                    │
│  ├─ chatMessages             (~10,000 saved messages)          │
│  ├─ savedChats               (~2,000 chat sessions)            │
│  └─ swipes                   (User swipe history)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 ARCHITECTURE PRINCIPLES

### 1. **Direct Database Access**
- **Next.js API routes** query MongoDB directly
- **No CMS overhead** - maximum performance
- **Custom business logic** in API routes
- **Building custom CRM/CMS** for agent management (future)

### 2. **Lightweight Authentication**
- **NextAuth.js v4** for authentication
- **OAuth providers**: Google, Facebook
- **JWT tokens** stored in HTTP-only cookies
- **Session management** via MongoDB adapter

### 3. **AI-First Design**
- **Groq LLM** as primary interface
- **Natural language** property search
- **Function calling** for map control
- **"Chap" experience** - Chat controls Map

### 4. **Performance First**
- **Direct MongoDB queries** (no ORM overhead)
- **Redis caching** (planned for VPS)
- **Edge deployment** on Vercel
- **Cloudinary CDN** for images
- **Service Worker** for offline support

### 5. **Multi-Tenant Ready (Future)**
- **Shared MLS data** across all agents
- **Tenant-scoped** user/content data
- **Custom CRM** for agent branding
- **White-label** frontend deployments

---

## 🛠️ TECHNOLOGY STACK

### Frontend (Next.js Application)

```yaml
Framework: Next.js 16.0.3
  - App Router (React Server Components)
  - Turbopack (dev mode, 862ms startup!)
  - Server Actions
  - API Routes

UI Layer: React 19.0.0
  - Client Components ("use client")
  - Server Components (default)
  - Suspense boundaries

Authentication: NextAuth.js 4.24.13
  - Google OAuth
  - Facebook OAuth
  - JWT strategy
  - MongoDB session adapter

Styling: Tailwind CSS 3.4.17
  - Custom theme (lightgradient/blackspace)
  - JIT compiler
  - Framer Motion animations

Maps: MapLibre GL 4.7.1
  - @vis.gl/react-maplibre
  - Supercluster (marker clustering)
  - Vector tiles (MapTiler)
  - Custom controls

State Management:
  - React Context (ThemeContext, ChatProvider, MLSProvider)
  - URL state (useSearchParams)
  - localStorage (favorites, preferences)
  - Cookies (auth, theme)

Icons: Lucide React 0.468.0
  - Tree-shakeable
  - Modular imports optimized
```

### Backend (Next.js API Routes + MongoDB)

```yaml
Runtime: Node.js 20.x
  - ES Modules
  - Native fetch
  - Streaming responses (chat)

Database: MongoDB 6.x
  - DigitalOcean Managed MongoDB
  - 80GB SSD, 4GB RAM
  - Connection pooling via Mongoose 8.9.3
  - Geospatial indexes (2dsphere)

API Routes: Next.js App Router
  - /api/mls-listings/* - Dual MLS queries
  - /api/chat/* - Groq AI streaming
  - /api/swipes/* - User preferences
  - /api/auth/* - NextAuth handlers
  - /api/photos/* - Photo fetching

Caching Strategy:
  - HTTP Cache-Control: 60s server cache
  - Stale-while-revalidate: 120s
  - Redis (planned): 5-min tile cache
  - Service Worker: 24hr asset cache
```

### AI & External Services

```yaml
AI Chat: Groq SDK 0.8.0
  Models:
    - llama-3.1-8b-instant (FREE tier, 840 TPS)
    - openai/gpt-oss-120b (PREMIUM, 131K context)
  Features:
    - Function calling (map control)
    - Streaming responses
    - Tool use
    - Context: 32k-131k tokens

MLS Data: Spark API (GPS + CRMLS)
  - Replication API
  - OAuth 2.0
  - Batch fetching (500/request)
  - Dual collection architecture

Image CDN: Cloudinary
  - Transform on-the-fly
  - Auto-optimization (WebP)
  - Lazy loading support
  - 40-60% bandwidth savings (with optimization)

Maps: MapTiler
  - Vector tiles
  - 4 style variants (dark, bright, satellite, toner)
  - Free tier: 100k tiles/month

Email: Nodemailer 7.0.10
  - SMTP (Google Workspace)
  - Contact forms
  - User notifications
```

---

## 🔄 DATA FLOW ARCHITECTURE

### User Authentication Flow (NextAuth)

```
User clicks "Sign in with Google"
    ↓
/api/auth/signin/google (NextAuth handler)
    ↓
Redirect to Google OAuth consent
    ↓
Google callback → /api/auth/callback/google
    ↓
NextAuth:
  1. Validates OAuth code
  2. Creates/updates user in MongoDB (users collection)
  3. Creates session in MongoDB (sessions collection)
  4. Issues JWT token
  5. Sets HTTP-only cookie
    ↓
Frontend: User authenticated
    ↓
useSession() hook provides user data
```

### MLS Listing Search Flow

```
User types in chat: "Show me 3-bed homes under $500k in Palm Desert"
    ↓
IntegratedChatWidget → POST /api/chat/stream
    ↓
Groq AI (llama-3.1-8b-instant)
  - Analyzes intent
  - Decides to call searchProperties tool
    ↓
Function Executor: searchProperties()
  - Resolves "Palm Desert" to coordinates
  - Builds filter: { beds: 3, maxPrice: 500000 }
  - Queries MongoDB
    ↓
Parallel Fetch:
  ├─ GPS listings:  db.listings.find({ city: "Palm Desert", ... })
  └─ CRMLS listings: db.crmlsListings.find({ city: "Palm Desert", ... })
    ↓
Merge results with mlsSource tag (GPS | CRMLS)
    ↓
AI formats response:
  {
    mapControl: { action: "panTo", location: {...}, zoom: 12 },
    message: "Found 47 homes in Palm Desert...",
    listings: [...]
  }
    ↓
Frontend (Chap experience):
  1. Map animates to Palm Desert
  2. Applies filters
  3. Displays listing carousel in chat
  4. Shows markers on map
```

### Swipe Queue Flow (Tinder-style Discovery)

```
User opens listing → Initialize swipe queue
    ↓
useSwipeQueue hook:
  1. Fetch listings within 5-mile radius
  2. Exclude already-swiped (GET /api/swipes/exclude-keys)
  3. Score by proximity tiers (7 tiers, 0-405 points):
     - Same subdivision + type + zip: 0-5
     - Same subdivision + type, diff zip: 50-55
     - Same city, within 5mi: 400-405
  4. Sort by score (lower = better match)
  5. Limit to 100 listings
    ↓
User swipes left/right
    ↓
Immediate persistence: POST /api/swipes/batch
  - Saves to MongoDB (swipes collection)
  - Updates user analytics (top subdivisions, cities)
  - Links anonymous sessions to accounts on login
    ↓
Advance to next listing in queue
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### NextAuth.js Architecture

**Providers:**
- Google OAuth 2.0
- Facebook OAuth
- Email/Password (future)

**Session Strategy:**
- **JWT** tokens (7-day expiry)
- **Database sessions** (MongoDB sessions collection)
- **HTTP-only cookies** (secure, sameSite: lax)

**User Roles:**
```typescript
type UserRole =
  | 'user'      // Default end user
  | 'investor'  // Premium tier (future subscriptions)
  | 'agent'     // Real estate agent (future multi-tenant)
  | 'admin'     // System administrator
```

**Access Control:**
```typescript
// API route protection
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role-based access
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... protected logic
}
```

**MongoDB Collections:**
- `users` - User profiles
- `accounts` - OAuth provider links
- `sessions` - Active sessions
- `verification_tokens` - Email verification (future)

---

## 🏢 FUTURE: CUSTOM CRM/CMS

### Vision: ChatRealty.io Agent Management Platform

**Goals:**
- Build proprietary CRM for agent/client relationships
- Replace need for external CMS platforms
- Tight integration with MLS data and AI features
- White-label deployments for agents

**Planned Features:**

#### 1. Agent Management
```typescript
// Collection: agents
{
  agentId: string,
  name: string,
  email: string,
  phone: string,
  mlsLicenseNumber: string,
  brokerageName: string,

  // Branding
  branding: {
    logo: string (Cloudinary URL),
    primaryColor: string,
    secondaryColor: string,
    customDomain: string, // e.g., "agent-name.chatrealty.io"
    theme: "lightgradient" | "blackspace"
  },

  // MLS Access
  mlsAccess: {
    sources: ["GPS", "CRMLS"],
    regions: ["Coachella Valley"],
    apiKeys: { /* encrypted */ }
  },

  // Features
  features: {
    aiChat: boolean,
    cmaGeneration: boolean,
    swipeMode: boolean,
    investorTools: boolean
  },

  // Analytics
  stats: {
    totalClients: number,
    activeLeads: number,
    closedDeals: number,
    revenue: number
  }
}
```

#### 2. Client Management (CRM Core)
```typescript
// Collection: clients
{
  clientId: string,
  agentId: string, // Links to agent
  name: string,
  email: string,
  phone: string,

  // Lead Status
  status: "new" | "active" | "nurture" | "closed" | "lost",
  source: "website" | "referral" | "social" | "direct",

  // Preferences (from AI/swipes)
  preferences: {
    priceRange: { min: number, max: number },
    beds: number,
    baths: number,
    cities: string[],
    subdivisions: string[],
    propertyTypes: ["A", "B", "C"],
    amenities: string[]
  },

  // Activity Tracking
  activity: {
    lastActive: Date,
    viewedListings: string[], // listing keys
    favoritedListings: string[],
    scheduledTours: ObjectId[], // ref: tours
    chatHistory: ObjectId[] // ref: chatSessions
  },

  // Communication
  communications: [
    {
      date: Date,
      type: "email" | "call" | "text" | "meeting",
      notes: string,
      outcome: string
    }
  ]
}
```

#### 3. Content Management
```typescript
// Collection: cms_pages
{
  pageId: string,
  tenantId: string, // Which agent's site
  type: "landing" | "about" | "blog" | "neighborhood" | "custom",

  slug: string,
  title: string,
  metaDescription: string,

  // Flexible content blocks
  blocks: [
    {
      type: "hero" | "text" | "listings" | "testimonials" | "cta",
      data: { /* block-specific data */ }
    }
  ],

  published: boolean,
  publishDate: Date
}
```

#### 4. Lead Capture & Automation
- Contact form submissions → Auto-create client record
- AI chat leads → Flag high-intent conversations
- Automated email follow-ups
- Tour scheduling integration
- CMA report generation triggers

#### 5. Analytics Dashboard
- Client funnel visualization
- AI chat effectiveness metrics
- Top-performing listings
- Revenue tracking
- Lead source attribution

### Implementation Timeline

**Phase 1 (Q1 2025):** Foundation
- Design CRM schema
- Build agent onboarding flow
- Create admin panel UI

**Phase 2 (Q2 2025):** Core CRM
- Client management interface
- Communication tracking
- Lead scoring

**Phase 3 (Q3 2025):** Multi-Tenant
- White-label deployments
- Custom domain support
- Branding customization

**Phase 4 (Q4 2025):** Automation
- Email workflows
- AI-powered lead nurture
- Automated CMA generation

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Current Production Setup

**Frontend:**
- **Platform:** Vercel
- **Domain:** jpsrealtor.com
- **Runtime:** Node.js 20.x serverless functions
- **Edge Network:** Global CDN
- **Build:** `npm run build` (optimized with SWC)
- **Performance:** 862ms dev startup, <3s production load

**Database:**
- **Platform:** DigitalOcean Managed MongoDB
- **Cluster:** jpsrealtor-mongodb-911080c1
- **Region:** NYC3 (New York)
- **Storage:** 80GB SSD
- **RAM:** 4GB dedicated
- **Replica Set:** 3 nodes
- **Backups:** Daily automatic backups
- **Connection:** `mongodb+srv://...mongo.ondigitalocean.com/jpsrealtor`

**VPS (Future Redis/Services):**
- **Provider:** DigitalOcean Droplet
- **IP:** 147.182.236.138
- **OS:** Ubuntu 22.04 LTS
- **Planned Services:**
  - Redis caching (listing tiles, API responses)
  - Static JSON cache (popular listings)
  - Cron jobs (MLS sync, analytics)

**DNS:**
- jpsrealtor.com → Vercel
- www.jpsrealtor.com → Redirect to jpsrealtor.com

### Environment Variables

**Frontend (.env.local):**
```bash
# Database
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Groq AI
GROQ_API_KEY=...

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_SECRET=...

# MLS APIs
GPS_MLS_KEY=...
CRMLS_API_KEY=...

# Redis (future)
REDIS_URL=redis://147.182.236.138:6379
```

---

## 🔌 EXTERNAL INTEGRATIONS

### Spark API (MLS Data)

**Purpose:** Fetch listings from GPS and CRMLS MLSs

**Endpoints:**
- Replication API: `https://replication.sparkapi.com/v1/listings`
- OAuth: `https://api.sparkapi.com/v1/oauth2/token`

**Data Pipeline:**
```
Spark API → Python scripts → MongoDB
  ├─ fetch.py (pulls raw MLS data)
  ├─ flatten.py (normalizes RESO fields)
  ├─ seed.py (upserts to MongoDB)
  └─ cache_photos.py (downloads primary photos)
```

**Collections:**
- `listings` (GPS active)
- `crmlsListings` (CRMLS active)
- `gpsClosedListings` (GPS sold/expired)
- `crmlsClosedListings` (CRMLS sold/expired)

**Sync Schedule:**
- Active listings: Every 12 hours (6 AM, 6 PM PST)
- Closed listings: Daily at 10 AM PST
- Photos: On-demand + nightly sync

### Groq AI

**Purpose:** Natural language property search and chat

**Models:**
- **FREE:** `llama-3.1-8b-instant` (840 TPS, ~$0.013/month/user)
- **PREMIUM:** `openai/gpt-oss-120b` (131K context, function calling)

**Function Tools:**
1. **matchLocation** - Resolve city/subdivision from natural language
2. **searchProperties** - Fetch listings with filters
3. **getCommunityFacts** - Get schools, demographics, amenities
4. **controlMap** - Pan/zoom map, apply filters (Chap feature)

**System Prompt:** Includes:
- Investment formulas (Cap Rate, CoC, DSCR)
- CMA generation guidance
- API documentation
- Listing data schema

### Cloudinary

**Purpose:** Image CDN and optimization

**Current Usage:**
- Direct URLs from MLS CDNs (Spark Platform, CRMLS)
- No transformation yet

**Planned Optimization:**
- Fetch API: Transform external MLS photos
- Auto-format: WebP for modern browsers
- Quality optimization: 70-80 (down from 100)
- Responsive sizing: 640/1024/1280px variants
- **Expected savings:** 40-60% bandwidth reduction

**Integration:**
```typescript
// src/lib/cloudinary.ts
export function getOptimizedMlsPhoto(url: string, width: number, quality: number) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_${width},q_${quality},f_auto/${encodeURIComponent(url)}`;
}
```

### MapTiler

**Purpose:** Vector map tiles

**Styles Available:**
- Dark (default)
- Bright (light mode)
- Satellite (aerial imagery)
- Toner (high contrast B&W)

**API Key:** Stored in `NEXT_PUBLIC_MAPTILER_API_KEY`

**Usage:** MapLibre GL consumes vector tiles

---

## 📊 SYSTEM METRICS

### Database Statistics
- **Total Documents:** ~115,000
- **Active Listings:** 32,000 (GPS + CRMLS)
- **Closed Listings:** 42,000
- **Photos Cached:** 40,000
- **Total Size:** ~8GB
- **Indexes:** 25+ (geospatial, compound, unique)
- **Queries/day:** ~50,000

### Frontend Performance
- **Dev Server Startup:** 862ms (95% improvement from optimizations)
- **Production Build:** ~60s
- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3s
- **Lighthouse Score:** 85+ (mobile)
- **Bundle Size:** ~350KB gzipped

### API Performance
- **Chat Streaming:** <500ms first token
- **Listing Search:** <200ms average (no cache), <20ms (with Redis - planned)
- **Map Tile Load:** <100ms (cached)
- **Photo Fetch:** 200ms (without optimization), <50ms (with Cloudinary - planned)

### Monthly Costs
- **MongoDB Atlas:** $30 (DigitalOcean Managed)
- **Vercel:** $0 (Hobby tier, may upgrade to Pro $20)
- **DigitalOcean VPS:** $12 (for future Redis)
- **Cloudinary:** $0 (free tier)
- **Groq AI:** $0 (free tier)
- **MapTiler:** $0 (free tier)
- **Domain:** $12/year
- **Total:** ~$42/month ($54 if Vercel Pro)

---

## 🔮 FUTURE ROADMAP

### Q1 2025: Performance & CDN
- [ ] Deploy Redis on VPS for API caching
- [ ] Implement Cloudinary image optimization
- [ ] Build tile-based map caching
- [ ] Add pagination to photo carousel
- [ ] Optimize bundle size (remove unused deps)

### Q2 2025: "Chap" Experience
- [ ] Create unified /chap route (Chat + Map)
- [ ] Build AI map control functions
- [ ] Desktop split-screen layout
- [ ] Mobile overlay with swipe gestures
- [ ] Synchronized selection state

### Q3 2025: Custom CRM Foundation
- [ ] Design CRM schema (agents, clients, communications)
- [ ] Build agent onboarding flow
- [ ] Create admin panel UI
- [ ] Lead capture and tracking

### Q4 2025: Multi-Tenant Launch
- [ ] White-label deployment system
- [ ] Custom domain support
- [ ] Branding customization per agent
- [ ] Launch ChatRealty.io marketplace

---

## 📚 RELATED DOCUMENTATION

- [master-plan.md](../../master-plan.md) - "Chap" (Chat + Map) Implementation Plan
- [MLS_DATA_ARCHITECTURE.md](./MLS_DATA_ARCHITECTURE.md) - Multi-tenant MLS strategy
- [DEEP_DIVE_OPTIMIZATIONS.md](../../DEEP_DIVE_OPTIMIZATIONS.md) - Performance improvements

---

## 🎯 KEY DIFFERENCES FROM PREVIOUS VERSIONS

### What Changed (v3.0.0):
- ❌ **Removed:** PayloadCMS (never used)
- ✅ **Added:** NextAuth.js (actual auth system)
- ✅ **Clarified:** Direct MongoDB access (no CMS overhead)
- ✅ **Added:** Custom CRM/CMS vision (future)
- ✅ **Updated:** Actual deployment architecture
- ✅ **Added:** "Chap" experience roadmap
- ✅ **Realistic:** Current costs and metrics

### Architecture Philosophy:
**Old (v2.0):** PayloadCMS-centric, heavy CMS layer
**New (v3.0):** Lightweight Next.js + NextAuth, building custom CRM

This architecture reflects **what is actually deployed** and **where we're headed**.

---

**END OF MASTER SYSTEM ARCHITECTURE v3.0.0**

This document is the authoritative source for the JPSRealtor.com and ChatRealty.io ecosystem architecture.
