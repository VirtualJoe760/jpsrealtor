# JPSRealtor.com Documentation Summary
**Complete System Overview & Reference Guide**
**Last Updated:** December 3, 2025

---

## 📚 TABLE OF CONTENTS

1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Technology Stack](#technology-stack)
5. [Data Management](#data-management)
6. [Development Guides](#development-guides)
7. [API Documentation](#api-documentation)
8. [Deployment & Operations](#deployment--operations)
9. [Documentation Index](#documentation-index)

---

## 🎯 EXECUTIVE OVERVIEW

JPSRealtor.com is an AI-powered real estate platform serving the Coachella Valley market with plans to scale into ChatRealty.io, a white-label agent network.

### Key Metrics
- **115,000+ MLS listings** (GPS + CRMLS combined)
- **32,000 active listings** displayed on website
- **~8GB database** with 80GB SSD capacity
- **~50,000 queries/day** with <50ms average response time
- **862ms dev startup** (95% improvement from optimizations)
- **$42-54/month** operational costs

### Platform Highlights
- **AI-First Design**: Groq LLM natural language property search
- **Dual MLS Integration**: GPS MLS + CRMLS unified access
- **Swipe Discovery**: Tinder-style property matching with 7-tier proximity scoring
- **Interactive Maps**: MapLibre GL with Supercluster clustering (1000-5000 listings)
- **CMS & Blog**: AI-powered article generation with Claude Sonnet 4.5
- **CRM System**: Lead generation from expired listings with skip tracing integration
- **Cloudflare CDN**: Workers + R2 multi-tier caching (96x speed improvement) ✨ NEW

---

## 🏗️ SYSTEM ARCHITECTURE

### Two-Tier Architecture

**Tier 1: Frontend Layer (Next.js 16 App Router)**
- NextAuth.js for OAuth authentication (Google, Facebook)
- Direct MongoDB access (no CMS overhead)
- Groq AI chat integration with streaming responses
- MapLibre GL + Supercluster for map rendering
- Dual theme system (lightgradient / blackspace)

**Tier 2: Data Layer (MongoDB Atlas - DigitalOcean NYC3)**
- 80GB SSD, 4GB RAM, 3-node replica set
- Collections: listings, crmlsListings, users, sessions, cities, subdivisions, photos, swipes, chatMessages, and more
- Geospatial indexes for fast location-based queries
- TTL indexes for expired listing cleanup

### Key Architectural Principles
1. **Direct Database Access** - Maximum performance, no CMS overhead
2. **Lightweight Authentication** - NextAuth.js with JWT tokens
3. **AI-First Design** - Natural language as primary interface
4. **Performance First** - Direct MongoDB queries, Redis caching (planned)
5. **Multi-Tenant Ready** - Shared MLS data, custom CRM for agents (future)

---

## 🚀 CORE FEATURES

### 1. **AI-Powered Chat & Property Search**
**Documentation**: [AI_INTEGRATION.md](./AI_INTEGRATION.md) | [AI_CONSOLE.md](./AI_CONSOLE.md)

- **Groq SDK** with openai/gpt-oss-120b.1-8b-instant (840 tokens/second)
- **Function calling** for location matching, property search, CMA generation
- **Investment analysis**: Cap Rate, Cash-on-Cash Return, DSCR, 1% Rule
- **Natural language queries**: "Show me 3-bed homes under $500k in Palm Desert"
- **Streaming responses** with real-time chat experience
- **AI Console**: Complete endpoint documentation and investment formulas

**Cost**: ~$0.013/month per user (FREE tier)

### 2. **Interactive Map System**
**Documentation**: [MAP_SYSTEM.md](./MAP_SYSTEM.md)

- **MapLibre GL 4.7.1** with @vis.gl/react-maplibre wrapper
- **Supercluster clustering** (radius 80px, max zoom 13)
- **Viewport-based loading**: 1000 listings at regular zoom, 5000 at high zoom
- **21+ filter parameters**: price, beds, baths, sqft, amenities, HOA, etc.
- **Dual MLS queries**: Parallel fetching from GPS + CRMLS
- **Performance**: 90-95% CPU reduction from marker optimization
- **4 map styles**: Dark, Bright, Satellite, Toner (via MapTiler)

**Performance Metrics**:
- Map initialization: <500ms
- Listing fetch (1000): 150-300ms
- Marker rendering: 100-200ms

### 3. **Swipe Discovery System**
**Documentation**: [SWIPE_SYSTEM.md](./SWIPE_SYSTEM.md)

- **Tinder-style** property discovery with swipe gestures
- **7-tier proximity scoring** (0-505 points, lower = better match)
- **Street-based micro-neighborhoods** for non-HOA properties
- **5-mile radius search** with smart prioritization
- **Immediate persistence** to MongoDB (no batching delays)
- **Analytics tracking**: Top subdivisions, cities, property types
- **30-minute TTL** for dislikes, permanent for likes

**Scoring Tiers**:
- Tier 1 (0-5): Same subdivision + same type
- Tier 2 (100-105): Same subdivision + different type
- Tier 3 (200-202): Within 2 miles + same type
- Tier 4 (300-305): Within 5 miles + same type
- Tier 5 (400-405): Within 5 miles + different type

### 4. **CMS & Insights Page**
**Documentation**: [CMS_AND_INSIGHTS_COMPLETE.md](./CMS_AND_INSIGHTS_COMPLETE.md)

- **AI article generation** with Claude Sonnet 4.5
- **Natural language search** with Groq AI
- **Auto-scrolling stats carousel** (6 metrics, 3-second intervals)
- **Category filtering**: All, Articles, Market Insights, Real Estate Tips
- **Topic cloud**: Auto-generated from article keywords
- **Market Stats**: Mortgage rates and economic indicators (API Ninja + FRED)
- **Publishing pipeline**: Draft → Publish → Auto-deploy to production

**Admin Features**:
- Minimal design with no card backgrounds
- Edit/Unpublish/Delete actions per article
- AI-powered field regeneration
- SEO optimization fields
- Preview modal for article review

### 5. **CRM & Lead Generation**
**Documentation**: [CRM_OVERVIEW.md](./CRM_OVERVIEW.md) | [EXPIRED_LISTINGS_IMPLEMENTATION.md](./EXPIRED_LISTINGS_IMPLEMENTATION.md)

**Lead Acquisition Pipeline**:
1. **SPARK API** - Fetch expired/cancelled MLS listings
2. **Tracerfy** - Skip tracing for homeowner contact info
3. **Drop Cowboy** - Automated voicemail drops
4. **Resend** - Email campaigns (contact@josephsardella.com)
5. **Custom CRM** - Unified inbox and lead management

**Database Collections**:
- `gpsExpiredListings` / `crmlsExpiredListings` (90-day retention)
- `gpsExpiredPhotos` / `crmlsExpiredPhotos`
- Lead tracking fields: skipTraced, voicemailSent, emailSent, ownerName, ownerPhone, ownerEmail

**Features**:
- Lead dashboard with status tracking
- Email inbox with AI-generated responses
- Consultation page generator with CMA
- Appointment scheduling
- Pipeline analytics

### 6. **Authentication & User Management**
**Documentation**: [AUTHENTICATION.md](./AUTHENTICATION.md)

- **NextAuth.js v4.24.13** with MongoDB adapter
- **OAuth providers**: Google, Facebook
- **JWT strategy** (7-day expiry, HTTP-only cookies)
- **User roles**: user, investor, agent, admin
- **Session management**: Database sessions + JWT tokens
- **Protected routes**: Role-based access control

**MongoDB Collections**:
- `users` - User profiles with roles
- `sessions` - Active sessions
- `accounts` - OAuth provider links
- `verification_tokens` - Email verification (future)

---

## 🛠️ TECHNOLOGY STACK

### Frontend
```yaml
Framework: Next.js 16.0.3
  - App Router with React Server Components
  - Turbopack (862ms dev startup)
  - Server Actions and API Routes

UI: React 19.0.0
  - Client/Server Components
  - Suspense boundaries
  - Concurrent rendering

Styling: Tailwind CSS 3.4.17
  - JIT compiler
  - Custom themes (lightgradient/blackspace)
  - Framer Motion animations

Maps: MapLibre GL 4.7.1
  - @vis.gl/react-maplibre
  - Supercluster clustering
  - Vector tiles (MapTiler)

State: React Context
  - ThemeContext, ChatProvider, MLSProvider
  - URL state (useSearchParams)
  - localStorage + Cookies
```

### Backend
```yaml
Runtime: Node.js 20.x
  - ES Modules
  - Native fetch
  - Streaming responses

Database: MongoDB 6.x
  - DigitalOcean Managed
  - 80GB SSD, 4GB RAM
  - Mongoose 8.9.3 ODM
  - Geospatial indexes

Caching:
  - Cloudflare Workers (Edge: 5min, R2: 15min) ✅ DEPLOYED
  - HTTP Cache-Control (60s)
  - Stale-while-revalidate (120s)
  - Service Worker (24hr)
  - 96x speed improvement on cached requests
```

### AI & External Services
```yaml
AI Chat: Groq SDK 0.8.0
  - FREE: openai/gpt-oss-120b.1-8b-instant (840 TPS)
  - PREMIUM: openai/gpt-oss-120b (131K context)

MLS Data: Spark API
  - GPS MLS + CRMLS data sharing
  - Replication API with OAuth 2.0
  - Batch fetching (500/request)

CDN: Cloudflare Workers + R2 ✅ DEPLOYED
  - Multi-tier caching (Edge → R2 → MongoDB)
  - Image transformation worker (WebP/AVIF auto-conversion)
  - 270+ global edge locations
  - Zero egress fees
  - ~$7/month operational cost

Maps: MapTiler
  - Vector tiles
  - 4 style variants
  - 100k tiles/month (free)

Email:
  - Nodemailer (Google Workspace)
  - Resend (josephsardella.com domain)

Skip Tracing: Tracerfy
  - Property address → Owner contact info
  - Batch processing support

Voicemail: Drop Cowboy
  - Ringless voicemail drops
  - Delivery & listen tracking
```

---

## 💾 DATA MANAGEMENT

### Database Collections (15+)

**MLS Listings**:
- `listings` (11,592 GPS active)
- `crmlsListings` (20,406 CRMLS active)
- `gpsClosedListings` (11,592 sold/expired)
- `crmlsClosedListings` (30,409 sold/expired)
- `gpsExpiredListings` (lead generation)
- `crmlsExpiredListings` (lead generation)
- `photos` (~40,000 cached)
- `gpsExpiredPhotos`, `crmlsExpiredPhotos`

**Content & Geography**:
- `cities` (~50 cities)
- `subdivisions` (~500 communities)
- `schools` (~200 schools)

**User Data**:
- `users` (~500)
- `sessions` (NextAuth managed)
- `accounts` (OAuth providers)
- `chatMessages` (~10,000)
- `savedChats` (~2,000)
- `swipes` (user swipe history)

### MLS Data Replication
**Documentation**: [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) | [platform/MLS_DATA_ARCHITECTURE.md](./platform/MLS_DATA_ARCHITECTURE.md)

**Pipeline** (Python scripts):
1. `fetch.py` - Fetch from Spark API replication endpoint
2. `flatten.py` - Flatten nested JSON to MongoDB-ready format
3. `seed.py` - Upsert to MongoDB collections
4. `cache_photos.py` - Download and cache primary photos
5. `update.py` - Incremental updates for modified listings

**Sync Schedule**:
- Active listings: Every 12 hours (6 AM, 6 PM PST)
- Closed listings: Daily at 10 AM PST
- Expired listings: Daily with 90-day cleanup
- Photos: On-demand + nightly sync

**Spark API Pagination** (Diego's Method):
- Use `_skiptoken` instead of `_skip` or `_page`
- Initial request: `_skiptoken=` (empty)
- Response includes `SkipToken` for next page
- End condition: Empty results OR token unchanged

---

## 📖 DEVELOPMENT GUIDES

### Performance Optimization
**Documentation**: [PERFORMANCE.md](./PERFORMANCE.md)

**Startup Improvements**:
- **Before**: 18 seconds
- **After**: 862ms (95% improvement!)

**Key Optimizations**:
- Removed unused dependencies (react-markdown, etc.)
- Optimized icon imports (tree-shakeable Lucide)
- Modular Framer Motion imports
- Lazy loading for heavy components
- Static canvas rendering for markers

**Map Performance**:
- 90-95% CPU reduction from marker optimization
- Viewport-based loading limits
- Debounced bounds updates (250ms)
- Efficient clustering with Supercluster

### Responsive Design
**Documentation**: [RESPONSIVE_DESIGN.md](./RESPONSIVE_DESIGN.md)

**Mobile-First Approach**:
- Tailwind breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Bottom navigation for mobile
- Enhanced sidebar for desktop
- Responsive map markers
- Touch-optimized swipe gestures

### Theme Implementation
**Documentation**: [THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md)

**Two Themes**:
- **lightgradient**: Animated multi-color gradient, blue accents
- **blackspace**: Dark neutral backgrounds, emerald accents

**Implementation**:
- ThemeContext with system/light/dark modes
- localStorage persistence
- useTheme() hook for components
- Tailwind theme variants

---

## 🔌 API DOCUMENTATION

### Core API Routes

**MLS Listings**:
- `GET /api/mls-listings` - Search with 21+ filter parameters
- `GET /api/mls-listings/[slugAddress]` - Single listing details
- `GET /api/mls-listings/[slugAddress]/photos` - Listing photos
- `GET /api/mls-listings/[slugAddress]/documents` - Documents

**AI Chat**:
- `POST /api/chat/stream` - Streaming chat with Groq AI
- `POST /api/chat/match-location` - Resolve natural language locations
- `POST /api/chat/search-city` - City-based property search
- `POST /api/ai/cma` - Generate Comparative Market Analysis
- `GET /api/ai/console` - AI system documentation

**Swipes**:
- `POST /api/swipes/batch` - Save swipe history
- `GET /api/swipes/exclude-keys` - Get already-swiped listings
- `GET /api/swipes/user` - User swipe analytics

**Articles/CMS**:
- `GET /api/articles/list` - All published articles
- `POST /api/articles/ai-search` - Natural language article search
- `GET /api/articles/topics` - Auto-generated topic cloud
- `POST /api/articles/generate` - AI article generation
- `POST /api/articles/publish` - Publish to site
- `DELETE /api/articles/unpublish` - Remove from site

**Market Data**:
- `GET /api/market-stats` - Mortgage rates + economic indicators
- `GET /api/mortgage-rates` - Current mortgage rates

**User & Auth**:
- `/api/auth/*` - NextAuth endpoints
- `GET /api/user/favorites` - User favorite listings
- `POST /api/user/favorites/[listingKey]` - Add/remove favorite

**Expired Listings** (Future CRM):
- `GET /api/expired-listings` - Lead generation listings
- `GET /api/expired-listings/[listingId]` - Single expired listing
- `PATCH /api/expired-listings/[listingId]` - Update lead status
- `POST /api/tracerfy/skip-trace` - Skip trace address
- `POST /api/drop-cowboy/webhook` - Voicemail delivery status
- `POST /api/inbound-email` - Resend webhook for replies

---

## 🚀 DEPLOYMENT & OPERATIONS

### Production Setup

**Frontend**:
- Platform: **Vercel**
- Domain: jpsrealtor.com
- Runtime: Node.js 20.x serverless
- Edge Network: Global CDN
- Build: `npm run build`
- Performance: <3s load time

**Database**:
- Platform: **DigitalOcean Managed MongoDB**
- Cluster: jpsrealtor-mongodb-911080c1
- Region: NYC3 (New York)
- Storage: 80GB SSD, 4GB RAM
- Replica Set: 3 nodes
- Backups: Daily automatic

**CDN & Caching**: ✅ DEPLOYED
- Platform: **Cloudflare Workers + R2**
- Nameservers: haley.ns.cloudflare.com, titan.ns.cloudflare.com
- Workers: jpsrealtor-listings-api, jpsrealtor-images
- R2 Buckets: listings-cache, listings-cache-preview
- Performance: 96x speedup on cached requests (13.2s → 0.137s)
- Cost: ~$7/month (saves $40/month vs Redis VPS)

### Environment Variables

**Required**:
```bash
# Database
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI
GROQ_API_KEY=...

# Maps & CDN
NEXT_PUBLIC_MAPTILER_API_KEY=...
CF_API_TOKEN=...
CF_ACCOUNT_ID=...
CF_ZONE_ID=...

# MLS APIs
SPARK_ACCESS_TOKEN=...
SPARK_OAUTH_KEY=...

# CRM
RESEND_API_KEY=...
DROP_COWBOY_TEAM_ID=...
TRACERFY_API_KEY=...
```

### Monthly Costs
- MongoDB Atlas: $30
- Vercel: $0-20 (Hobby/Pro)
- Cloudflare Workers + R2: $7 ✅ DEPLOYED
- Groq AI: $0 (free tier)
- MapTiler: $0 (free tier)
- **Total**: ~$37-57/month
- **Savings**: $40/month vs Redis VPS alternative

---

## 📋 DOCUMENTATION INDEX

### Architecture & System Design
- **[MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)** - Complete system overview
- **[FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)** - Frontend structure and patterns
- **[DATABASE_MODELS.md](./DATABASE_MODELS.md)** - MongoDB schemas and collections
- **[MLS_DATA_ARCHITECTURE.md](./platform/MLS_DATA_ARCHITECTURE.md)** - Multi-tenant MLS design

### Features & Functionality
- **[CMS_AND_INSIGHTS_COMPLETE.md](./CMS_AND_INSIGHTS_COMPLETE.md)** - Complete CMS/blog system
- **[AI_INTEGRATION.md](./AI_INTEGRATION.md)** - Groq AI chat integration
- **[AI_CONSOLE.md](./AI_CONSOLE.md)** - AI system console and formulas
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - NextAuth setup and OAuth
- **[MAP_SYSTEM.md](./MAP_SYSTEM.md)** - MapLibre GL implementation
- **[SWIPE_SYSTEM.md](./SWIPE_SYSTEM.md)** - Tinder-style property discovery
- **[COMMUNITY_FACTS.md](./COMMUNITY_FACTS.md)** - HOA/subdivision data
- **[INSIGHTS_PAGE.md](./INSIGHTS_PAGE.md)** - Analytics and insights

### CRM & Lead Generation
- **[CRM_OVERVIEW.md](./CRM_OVERVIEW.md)** - Complete CRM system architecture
- **[EXPIRED_LISTINGS_IMPLEMENTATION.md](./EXPIRED_LISTINGS_IMPLEMENTATION.md)** - Expired listing pipeline
- **[EXPIRED_LISTINGS_TESTING.md](./EXPIRED_LISTINGS_TESTING.md)** - Testing checklist
- **[REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md)** - MLS data sync system

### Development & Deployment
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimizations (862ms startup)
- **[RESPONSIVE_DESIGN.md](./RESPONSIVE_DESIGN.md)** - Mobile-first responsive patterns
- **[THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md)** - Dual theme system
- **[ARTICLE_GENERATION_GROQ.md](./ARTICLE_GENERATION_GROQ.md)** - AI article generation
- **[SECURITY_AUDIT_2025-11-29.md](./SECURITY_AUDIT_2025-11-29.md)** - Security review
- **[CLOUDFLARE_DEPLOYMENT_COMPLETE.md](./CLOUDFLARE_DEPLOYMENT_COMPLETE.md)** - Cloudflare CDN deployment ✨ NEW
- **[CLOUDFLARE_IMPLEMENTATION.md](./CLOUDFLARE_IMPLEMENTATION.md)** - Technical architecture guide
- **[CLOUDFLARE_API_AUTOMATION.md](./CLOUDFLARE_API_AUTOMATION.md)** - API automation documentation

### Testing
- **[TESTING_ARTICLE_SEARCH.md](./TESTING_ARTICLE_SEARCH.md)** - Article search testing

---

## 🔮 FUTURE ROADMAP

### Q1 2025: Performance & CDN
- [x] Deploy Cloudflare Workers + R2 for API caching ✅ COMPLETE (Dec 3, 2025)
- [x] Implement image optimization worker (WebP/AVIF) ✅ COMPLETE
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
- [ ] Email workflow automation

### Q4 2025: Multi-Tenant Launch
- [ ] White-label deployment system
- [ ] Custom domain support per agent
- [ ] Branding customization (logos, colors)
- [ ] Launch ChatRealty.io marketplace

---

## 📞 SUPPORT & CONTACT

**Joseph Sardella**
- 📧 Email: josephsardella@gmail.com
- 📱 Phone: (760) 833-6334
- 🌐 Website: https://jpsrealtor.com
- 💼 License: DRE# 02106916

**For Documentation Issues**:
Report at: https://github.com/anthropics/claude-code/issues

---

## 🔐 SECURITY NOTE

**NEVER COMMIT REAL SECRETS TO DOCUMENTATION!**

All documentation files are committed to GitHub and are PUBLIC. Always use placeholders:

✅ **Safe**: `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname`
❌ **Never**: Actual connection strings, API keys, passwords

---

**Last Security Audit:** November 29, 2025
**All secrets sanitized and verified safe for public GitHub repository.**

---

This documentation summary provides a complete overview of the JPSRealtor.com platform. For detailed information on specific features, refer to the individual documentation files linked throughout this document.
