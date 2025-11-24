# 🏗️ MASTER SYSTEM ARCHITECTURE
**ChatRealty.io Ecosystem - Complete Technical Specification**
**Last Updated:** November 23, 2025
**Version:** 2.0.0 (Unified Architecture)

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [Repository Structure](#repository-structure)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Multi-Tenant Strategy](#multi-tenant-strategy)
9. [Deployment Architecture](#deployment-architecture)
10. [External Integrations](#external-integrations)

---

## 🎯 EXECUTIVE SUMMARY

**ChatRealty.io** is a white-label real estate platform ecosystem enabling:
- **Multi-agent network**: Independent real estate agents deploy branded websites
- **Centralized data**: Single PayloadCMS backend serves all tenants
- **Shared MLS pool**: 42,000+ listings from GPS + CRMLS
- **AI-powered chat**: Groq LLM with function calling
- **Swipe discovery**: Tinder-style property matching
- **CMA engine**: Automated market analysis
- **Role-based access**: Clients, Investors, Agents, Admins

### Current Deployment

**Primary Site:** JPSRealtor.com (Joseph Sardella, Palm Springs)
- Frontend: https://jpsrealtor.com
- Backend CMS: https://cms.jpsrealtor.com
- Database: MongoDB Atlas (DigitalOcean)

**Future Sites:** ChatRealty.io agent network
- Multiple branded frontends
- Shared backend infrastructure
- Tenant-isolated data where needed

---

## 🌐 SYSTEM OVERVIEW

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: FRONTEND LAYER                       │
│                  (Next.js 16 - App Router)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ JPSRealtor  │  │   Agent #2  │  │   Agent #N  │  (Future)  │
│  │   .com      │  │ ChatRealty  │  │ ChatRealty  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                          │                                      │
│                   All consume same APIs                         │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TIER 2: API/CMS LAYER                         │
│              (PayloadCMS 3.x + Next.js APIs)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PayloadCMS Backend (cms.jpsrealtor.com)                       │
│  ├─ Authentication (JWT + OAuth)                               │
│  ├─ User Management (Roles, Tiers, Subscriptions)              │
│  ├─ Content Management (Cities, Neighborhoods, Blog)           │
│  ├─ Tenant Configuration (Branding, Settings)                  │
│  ├─ Admin Panel (Role-based dashboards)                        │
│  └─ Media Management (Cloudinary integration)                  │
│                                                                 │
│  Next.js API Routes (Frontend proxy layer)                     │
│  ├─ /api/chat/* → Groq AI + Function Calling                   │
│  ├─ /api/mls-listings/* → Direct MongoDB queries               │
│  ├─ /api/user/* → Payload CMS proxy                            │
│  ├─ /api/swipes/* → MongoDB swipe tracking                     │
│  └─ /api/auth/oauth/* → OAuth → Payload bridge                 │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 3: DATA LAYER                           │
│              (MongoDB Atlas - DigitalOcean)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database: jpsrealtor                                           │
│  ├─ users                    (~500 docs) ← Payload managed     │
│  ├─ payload-preferences      (Payload internal)                │
│  ├─ payload-migrations       (Payload internal)                │
│  ├─ listings                 (11,592 GPS active)               │
│  ├─ crmlsListings            (20,406 CRMLS active)             │
│  ├─ gpsClosedListings        (11,592 GPS sold)                 │
│  ├─ crmlsClosedListings      (30,409 CRMLS sold)               │
│  ├─ photos                   (~40,000 cached photos)           │
│  ├─ cities                   (~50 docs) ← Payload managed      │
│  ├─ neighborhoods            (~500 docs) ← Payload managed     │
│  ├─ schools                  (~200 docs) ← Payload managed     │
│  ├─ chatMessages             (~10,000 saved messages)          │
│  ├─ savedChats               (~2,000 chat sessions)            │
│  └─ blogposts                ← Payload managed                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 ARCHITECTURE PRINCIPLES

### 1. **Single Source of Truth**
- **MongoDB Atlas** is the only database
- **PayloadCMS** manages structured content and users
- **Direct queries** for performance-critical MLS data
- **No data duplication** between systems

### 2. **Authentication Unification**
- **PayloadCMS** is the ONLY auth system
- **No NextAuth.js** - removed entirely
- **OAuth flows** bridge through Next.js → Payload
- **JWT tokens** issued by Payload, validated everywhere
- **Session management** via Payload's built-in system

### 3. **Multi-Tenant Ready**
- **Shared backend** (PayloadCMS) serves all agents
- **Tenant isolation** via branding/config collections
- **Shared MLS pool** with optional per-agent filters
- **User scoping** - users belong to specific agents/brands

### 4. **Performance First**
- **Direct MongoDB** access for listings (no Payload overhead)
- **Payload CMS** for content that benefits from admin UI
- **Edge caching** for static content
- **Lazy loading** for large datasets

### 5. **Developer Experience**
- **TypeScript everywhere** - full type safety
- **Monorepo structure** (future chatRealty umbrella)
- **Shared types** across frontend/backend
- **Hot reload** in development
- **Automatic API generation** via Payload

---

## 🛠️ TECHNOLOGY STACK

### Frontend (Next.js Application)

```yaml
Framework: Next.js 16.0.3
  - App Router (not Pages Router)
  - React Server Components
  - Turbopack (dev mode)
  - Server Actions

UI Layer: React 19.0.0
  - Client Components ("use client")
  - Server Components (default)
  - Suspense boundaries
  - Error boundaries

Styling: Tailwind CSS 3.4.17
  - Custom theme (lightgradient/blackspace)
  - JIT compiler
  - Custom plugins
  - PostCSS

Animations: Framer Motion 11.15.0
  - Page transitions
  - Swipe gestures
  - Loading states

State Management:
  - React Context (ThemeContext, ChatProvider)
  - URL state (useSearchParams)
  - Local storage (favorites, preferences)

Maps: MapLibre GL 4.7.1
  - Vector tiles (MapTiler)
  - Supercluster (marker clustering)
  - Custom controls
  - GeoJSON overlays

Icons: Lucide React 0.468.0
  - Tree-shakeable
  - Consistent sizing
  - Custom variants
```

### Backend (PayloadCMS + Next.js APIs)

```yaml
CMS: PayloadCMS 3.64.0
  - MongoDB adapter (@payloadcms/db-mongodb)
  - Lexical editor (@payloadcms/richtext-lexical)
  - Nodemailer email (@payloadcms/email-nodemailer)
  - Cloud storage plugin (Cloudinary)
  - Built-in auth (JWT)
  - Admin panel (React)
  - REST + GraphQL APIs

Runtime: Node.js 20.x
  - ES Modules (type: "module")
  - Native fetch
  - WebSocket support

Database Driver: Mongoose 8.9.3
  - Connection pooling
  - Schema validation
  - Middleware hooks
  - Transactions

API Framework: Next.js API Routes
  - Route handlers (App Router)
  - Middleware
  - Edge runtime (select routes)
  - Streaming responses (chat)

Email: Nodemailer 7.0.10
  - SMTP transport
  - HTML templates
  - Attachment support
```

### Database (MongoDB Atlas)

```yaml
Provider: DigitalOcean Managed MongoDB
Version: MongoDB 6.x
Cluster: jpsrealtor-mongodb-911080c1
Region: NYC3 (New York)
Storage: 80GB SSD
RAM: 4GB dedicated

Configuration:
  - Replica set (3 nodes)
  - Automatic backups (daily)
  - Point-in-time recovery
  - SSL/TLS enforced
  - IP whitelisting

Connection:
  URI: mongodb+srv://doadmin:***@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin
  Database: jpsrealtor
  Max pool size: 50
  Timeout: 30s
```

### AI & External Services

```yaml
AI Chat: Groq SDK 0.8.0
  Model: llama-3.1-70b-versatile
  Features:
    - Function calling
    - Streaming responses
    - Tool use
    - Context window: 32k tokens

MLS Data: Spark API (GPS + CRMLS)
  - Replication API
  - OAuth 2.0
  - Batch fetching (500/request)
  - Webhook support (future)

Image CDN: Cloudinary
  - Media library
  - Transformations
  - Optimization
  - Lazy loading

Geocoding: OpenCage
  - Address → Lat/Lon
  - Reverse geocoding
  - Batch processing

Business Data: Yelp Fusion API
  - Local amenities
  - Reviews
  - Photos

Email: SMTP (Google)
  - App passwords
  - Rate limiting
  - Bounce handling

Payments: Stripe (future)
  - Subscriptions
  - Webhooks
  - Customer portal
```

---

## 📁 REPOSITORY STRUCTURE

### Three Repository Model

```
F:/web-clients/joseph-sardella/
├── chatRealty/                    # Master meta-repository (this)
│   ├── memory-files/              # Unified architecture docs
│   │   ├── MASTER_SYSTEM_ARCHITECTURE.md
│   │   ├── FRONTEND_ARCHITECTURE.md
│   │   ├── BACKEND_ARCHITECTURE.md
│   │   ├── AUTH_ARCHITECTURE.md
│   │   ├── DATABASE_ARCHITECTURE.md
│   │   ├── MULTI_TENANT_ARCHITECTURE.md
│   │   ├── COLLECTIONS_REFERENCE.md
│   │   ├── DEPLOYMENT_PIPELINE.md
│   │   ├── INTEGRATION_NOTES.md
│   │   ├── DEVELOPER_ONBOARDING.md
│   │   └── README.md
│   └── (future: shared packages, types, configs)
│
├── jpsrealtor/                    # Frontend Next.js app
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── api/               # API routes
│   │   │   ├── components/        # React components
│   │   │   ├── contexts/          # React contexts
│   │   │   └── (other routes)
│   │   ├── lib/                   # Backend utilities
│   │   │   ├── groq.ts            # AI chat
│   │   │   ├── mongoose.ts        # DB connection
│   │   │   └── cms-client.ts      # Payload SDK (future)
│   │   ├── models/                # Mongoose models
│   │   ├── scripts/               # Build/deployment scripts
│   │   └── types/                 # TypeScript types
│   ├── public/                    # Static assets
│   ├── memory-files/              # Copy of master architecture
│   │   └── master-architecture/   # (identical to chatRealty)
│   ├── .env.local                 # Environment variables
│   ├── next.config.mjs            # Next.js config
│   ├── tailwind.config.ts         # Tailwind config
│   └── package.json
│
└── jpsrealtor-cms/                # PayloadCMS backend
    ├── src/
    │   ├── collections/           # Payload collections
    │   │   ├── Users.ts
    │   │   ├── Cities.ts
    │   │   ├── Neighborhoods.ts
    │   │   ├── Schools.ts
    │   │   ├── BlogPosts.ts
    │   │   ├── Contacts.ts
    │   │   └── Media.ts
    │   ├── hooks/                 # Payload hooks
    │   ├── routes/                # Custom endpoints
    │   └── utils/                 # Helper functions
    ├── memory-files/              # Copy of master architecture
    │   └── master-architecture/   # (identical to chatRealty)
    ├── .env                       # Environment variables
    ├── payload.config.ts          # Payload configuration
    └── package.json
```

---

## 🔄 DATA FLOW ARCHITECTURE

### User Authentication Flow

```
┌──────────┐
│  User    │
│  Browser │
└────┬─────┘
     │
     │ 1. Click "Sign in with Google"
     ▼
┌─────────────────────┐
│  Frontend           │
│  /api/auth/google   │  ← Next.js API route
└────┬────────────────┘
     │
     │ 2. Redirect to Google OAuth
     ▼
┌─────────────────────┐
│  Google OAuth       │
│  consent screen     │
└────┬────────────────┘
     │
     │ 3. User authorizes → callback with code
     ▼
┌─────────────────────┐
│  Frontend           │
│  /api/auth/callback │
└────┬────────────────┘
     │
     │ 4. POST code to Payload
     ▼
┌─────────────────────┐
│  PayloadCMS         │
│  /api/users/login   │  ← Exchange code for user
└────┬────────────────┘
     │
     │ 5. Create/update user, issue JWT
     ▼
┌─────────────────────┐
│  MongoDB            │
│  users collection   │
└────┬────────────────┘
     │
     │ 6. Return JWT token + user data
     ▼
┌─────────────────────┐
│  Frontend           │
│  Store in cookies   │
│  Update UI          │
└─────────────────────┘
```

### MLS Listing Search Flow

```
┌──────────┐
│  User    │
│  Types   │  "Show me homes in Palm Desert"
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│  IntegratedChatWidget│  ← React component
│  sends message      │
└────┬────────────────┘
     │
     │ POST /api/chat/stream
     ▼
┌─────────────────────┐
│  Groq AI            │  ← llama-3.1-70b-versatile
│  analyzes intent    │
└────┬────────────────┘
     │
     │ AI decides: call matchLocation()
     ▼
┌─────────────────────┐
│  /api/chat/         │
│  match-location     │  ← Function executor
└────┬────────────────┘
     │
     │ Query subdivisions collection
     ▼
┌─────────────────────┐
│  MongoDB            │
│  subdivisions       │  ← Returns: "palm-desert-country-club"
└────┬────────────────┘
     │
     │ Result back to AI
     ▼
┌─────────────────────┐
│  Groq AI            │
│  decides next:      │  ← Call getSubdivisionListings()
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│  /api/subdivisions/ │
│  [slug]/listings    │  ← Next.js API route
└────┬────────────────┘
     │
     │ db.listings.find({ subdivisionName: "..." })
     ▼
┌─────────────────────┐
│  MongoDB            │
│  listings + photos  │  ← Returns 20 sorted results
└────┬────────────────┘
     │
     │ Format for display
     ▼
┌─────────────────────┐
│  Frontend           │
│  ListingCarousel    │  ← Renders results
└─────────────────────┘
```

### Swipe Mode Flow

```
User clicks "Swipe Through All"
  ↓
IntegratedChatWidget.handleViewListingsInSwipeMode()
  ↓
Create SwipeSession {
  batchId: crypto.randomUUID()
  subdivision: "Palm Desert Country Club"
  listings: [20 properties]
  currentIndex: 0
}
  ↓
Open ListingBottomPanel with first listing
  ↓
User swipes left/right
  ↓
handleSwipeLeft() / handleSwipeRight()
  ↓
If right swipe → Save to favorites (future: POST to Payload)
  ↓
Increment currentIndex
  ↓
If currentIndex < total:
  Show next listing
Else:
  Show SwipeCompletionModal
  ↓
Save favorites to user profile (MongoDB)
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Architecture

**System:** PayloadCMS Built-in Auth (JWT-based)

**Flows:**
1. **Email/Password**: Payload native
2. **Google OAuth**: Next.js bridge → Payload
3. **Facebook OAuth**: Next.js bridge → Payload

**Token Management:**
- **Access Token**: JWT, 7-day expiry
- **Refresh Token**: MongoDB-stored, 30-day expiry
- **Storage**: HTTP-only cookies (secure, sameSite)

**User Roles:**
```typescript
type UserRole =
  | 'admin'           // Full system access
  | 'agent'           // Agent account (can manage own brand)
  | 'broker'          // Team leader (manages agents)
  | 'client'          // End user (free tier)
  | 'investor'        // Paid tier (enhanced features)
  | 'provider'        // Service providers (title, lender)
  | 'host'            // Vacation rental hosts
```

**Access Control:**
- **Field-level**: Payload collections enforce per-role
- **Route-level**: Next.js middleware checks JWT
- **Data-level**: MongoDB queries filter by user scope

See [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) for complete details.

---

## 🏢 MULTI-TENANT STRATEGY

### Tenant Model

**Primary Tenant:** JPSRealtor.com (Joseph Sardella)
**Future Tenants:** Other real estate agents via ChatRealty.io

### Shared vs Isolated Data

**Shared (Global):**
- MLS listings (all agents see same pool)
- Cities, Neighborhoods, Schools
- Photos cache
- AI models/prompts

**Isolated (Per-Tenant):**
- User accounts (scoped to agent)
- Saved searches
- Favorites
- Chat history
- CMA reports
- Branding/theme

### Tenant Configuration

**Payload Collection:** `websiteForks` (future)

```typescript
{
  tenantId: "jps-realtor",
  agentName: "Joseph Sardella",
  agentEmail: "joseph@jpsrealtor.com",
  domain: "jpsrealtor.com",
  branding: {
    logo: "https://...",
    primaryColor: "#1e40af",
    secondaryColor: "#10b981",
    theme: "lightgradient"
  },
  mlsAccess: {
    sources: ["GPS", "CRMLS"],
    regions: ["Coachella Valley"]
  },
  features: {
    chat: true,
    cma: true,
    swipe: true,
    investorTiers: true
  }
}
```

### Frontend Routing Strategy

**Option A (Current):** Separate deployments
- jpsrealtor.com → jpsrealtor repo
- agent2.chatrealty.io → agent2 repo (fork)

**Option B (Future):** Dynamic routing
- *.chatrealty.io → single Next.js app
- Tenant resolved from subdomain
- Branding loaded from Payload

See [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) for complete strategy.

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Current Deployment

**Frontend (jpsrealtor):**
- Platform: Vercel (recommended) or DigitalOcean App Platform
- Domain: jpsrealtor.com
- Build: `npm run build`
- Runtime: Node.js 20.x serverless
- Regions: Auto (edge globally)

**Backend CMS (jpsrealtor-cms):**
- Platform: DigitalOcean VPS (Droplet)
- Domain: cms.jpsrealtor.com
- Server: Ubuntu 22.04 LTS
- Process Manager: PM2
- Web Server: Nginx (reverse proxy)
- Port: 3002 → Nginx → 443 (SSL)

**Database:**
- Platform: DigitalOcean Managed MongoDB
- Region: NYC3
- Endpoint: jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com

**DNS:**
- Provider: (your DNS provider)
- Records:
  - `jpsrealtor.com` → Vercel A/CNAME
  - `cms.jpsrealtor.com` → VPS IP
  - `www.jpsrealtor.com` → Vercel redirect

### Environment Variables

**Frontend (.env.local):**
```bash
# Payload CMS
NEXT_PUBLIC_CMS_URL=https://cms.jpsrealtor.com

# Database
MONGODB_URI=mongodb+srv://...

# AI
GROQ_API_KEY=...

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Media
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_SECRET=...
```

**Backend CMS (.env):**
```bash
# Payload
PAYLOAD_SECRET=...
NEXT_CMS_URL=https://cms.jpsrealtor.com

# Database
MONGODB_URI=mongodb+srv://...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@jpsrealtor.com
```

See [DEPLOYMENT_PIPELINE.md](./DEPLOYMENT_PIPELINE.md) for complete deployment steps.

---

## 🔌 EXTERNAL INTEGRATIONS

### Spark API (MLS Data)

**Purpose:** Fetch MLS listings from GPS and CRMLS

**Endpoints:**
- Replication API: `https://replication.sparkapi.com/v1/listings`
- OAuth: `https://api.sparkapi.com/v1/oauth2/token`

**Authentication:** OAuth 2.0
- Client ID: (in .env)
- Client Secret: (in .env)
- Token refresh: Automatic

**Data Pipeline:**
```
Spark API → fetch.py → flatten.py → seed.py → MongoDB
                                       ↓
                                cache_photos.py
```

**Schedule:**
- Active listings: Every 12 hours (6 AM, 6 PM)
- Closed listings: Daily at 10 AM
- Photos: On-demand + daily sync

### Groq AI

**Purpose:** AI chat with function calling

**Model:** llama-3.1-70b-versatile
- Context window: 32k tokens
- Streaming: Yes
- Function calling: Yes (tools)
- Cost: Free tier (10k requests/day)

**Functions Registered:**
1. `matchLocation` - Resolve city/subdivision from query
2. `getSubdivisionListings` - Fetch listings by subdivision
3. `searchListings` - General MLS search with filters
4. `getCommunityFacts` - Get schools, demographics, amenities

### Cloudinary

**Purpose:** Image CDN and transformations

**Features:**
- Upload from URLs
- Auto-optimize (WebP, compression)
- Lazy loading support
- Transformations (resize, crop, format)

**Integration:**
- PayloadCMS plugin: @payloadcms/plugin-cloud-storage
- Upload handler: Automatic on media uploads
- URL format: `https://res.cloudinary.com/duqgao9h8/image/upload/...`

### Email (SMTP)

**Provider:** Google Workspace / Gmail

**Use Cases:**
- User verification emails
- Password reset
- Contact form submissions
- Admin notifications

**Configuration:**
- Host: smtp.gmail.com
- Port: 587 (STARTTLS)
- Auth: App password

---

## 📊 SYSTEM METRICS

### Database Size
- **Total documents**: ~115,000
- **Total size**: ~8GB
- **Indexes**: 25 indexes across collections
- **Queries/day**: ~50,000

### Frontend Performance
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Lighthouse Score**: 85+ (mobile)
- **Bundle size**: ~350KB (gzipped)

### API Performance
- **Chat streaming**: <500ms first token
- **Listing search**: <200ms average
- **Map tile load**: <100ms (cached)

### Costs (Monthly)
- MongoDB Atlas: $30
- DigitalOcean VPS: $12
- Cloudinary: $0 (free tier)
- Groq: $0 (free tier)
- Domain: $12/year
- **Total**: ~$42/month

---

## 🔮 FUTURE ROADMAP

### Phase 1: Multi-Tenant Foundation (Q1 2026)
- [ ] Create `websiteForks` collection in Payload
- [ ] Implement tenant-scoped queries
- [ ] Build branding configuration system
- [ ] Deploy second agent site (proof of concept)

### Phase 2: Enhanced Features (Q2 2026)
- [ ] Stripe integration (subscriptions)
- [ ] Advanced CMA with PDF generation
- [ ] Mobile apps (React Native)
- [ ] Real-time chat (WebSocket)

### Phase 3: ChatRealty.io Launch (Q3 2026)
- [ ] Agent onboarding portal
- [ ] Marketplace for service providers
- [ ] Centralized analytics dashboard
- [ ] Multi-agent collaboration tools

---

## 📚 RELATED DOCUMENTATION

- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - Next.js app structure
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - PayloadCMS details
- [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) - Authentication flows
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - MongoDB schema
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) - Tenant strategy
- [COLLECTIONS_REFERENCE.md](./COLLECTIONS_REFERENCE.md) - All collections
- [DEPLOYMENT_PIPELINE.md](./DEPLOYMENT_PIPELINE.md) - Deployment guide
- [INTEGRATION_NOTES.md](./INTEGRATION_NOTES.md) - Integration patterns
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - Getting started

---

**END OF MASTER SYSTEM ARCHITECTURE**

This document is the authoritative source for the ChatRealty.io ecosystem architecture. All other documentation files are derived from or complementary to this master specification.
