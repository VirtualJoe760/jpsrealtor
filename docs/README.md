# JPSRealtor Documentation

**Last Updated**: December 19, 2025

Complete technical documentation for the JPSRealtor platform - a modern real estate application built with Next.js 16, featuring unified MLS data integration (78,904+ listings from 8 MLSs), intelligent map clustering, AI-powered tools, and comprehensive CRM functionality.

---

## 🚨 SECURITY WARNING

**NEVER COMMIT REAL SECRETS TO DOCUMENTATION!**

All documentation files are committed to GitHub and are PUBLIC. Always use placeholders:

### ✅ Safe Placeholders
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
ANTHROPIC_API_KEY=sk-ant-api03-...
GROQ_API_KEY=gsk_...
```

### ❌ Never Include
- Real API keys, passwords, database URIs, OAuth secrets, or cloud credentials

---

## 📁 Documentation Structure

### [📐 Architecture](./architecture/) - System Design & Infrastructure
Core system architecture, database design, and frontend framework documentation.

**Files**:
- **MASTER_SYSTEM_ARCHITECTURE.md** - Complete system overview
- **DATABASE_ARCHITECTURE.md** - MongoDB schema design
- **MLS_DATA_ARCHITECTURE.md** - MLS integration architecture
- **FRONTEND_ARCHITECTURE.md** - Next.js structure
- **DATABASE_MODELS.md** - Mongoose model reference
- **PERFORMANCE.md** - Performance optimizations
- **QUERY_PERFORMANCE_OPTIMIZATION.md** ⭐ **New** - Query optimization (51s → 500ms)
- **AI_CHAT_PERFORMANCE_ANALYSIS.md** ⭐ **New** - AI chat optimization (86s → 500ms)
- **RESPONSIVE_DESIGN.md** - Mobile-first design
- **ANALYTICS_SYSTEM.md** - Analytics & appreciation system
- **ANALYTICS_ARCHITECTURE.md** - Real estate analytics architecture
- **CLOSED_LISTINGS_SYSTEM.md** - Closed listings & analytics
- **CHAT_ARCHITECTURE.md** - Chat/query architecture

---

### [🗺️ Map](./map/) - Mapping System
Interactive map with intelligent clustering, server-side rendering, and real-time listing display.

**Files**:
- **MAP_FIXES_COMPLETE.md** - Latest fixes (server crash + React key)
- **MAPPING_SYSTEM_ARCHITECTURE.md** - Complete map architecture
- **UNIFIED_LISTINGS_AUDIT.md** - Collection usage audit

---

### [🏠 Listings](./listings/) - MLS Data Integration
Unified MLS architecture supporting 8+ MLSs with consistent schema (78,904+ listings).

**Files**:
- **UNIFIED_MLS_ARCHITECTURE.md** - Complete unified MLS system
- **PROPERTY_TYPES_AND_DATA_PIPELINE.md** - Property categorization
- **TRELLO_IMPORT_CMA_AND_UNIFIED.md** - Trello CMA workflow
- **CITIES_SUBDIVISIONS_UNIFIED_INTEGRATION.md** - Geographic data

---

### [📝 CMS](./cms/) - Content Management
Article generation, insights page, and AI-powered content creation.

**Files**:
- **CMS_AND_INSIGHTS_COMPLETE.md** - Complete CMS system
- **ARTICLE_GENERATION_GROQ.md** - AI article generation (Groq)

---

### [🤖 AI](./ai/) - AI Integration
AI-powered tools including ChatGPT, Groq, and intelligent features.

**Files**:
- **AI_TOOLS_UNIFIED_INTEGRATION.md** - Complete AI tools guide

---

### [👥 CRM](./crm/) - Customer Relationship Management ⭐ **UPDATED JAN 14**
Lead management, user tracking, and marketing automation. **Major refactoring initiative in progress**.

**Files**:
- **CRM_DOCUMENTATION_INDEX.md** ⭐ **NEW** - Complete CRM documentation hub
- **CRM_REFACTOR_PRIORITIES.md** ⭐ **NEW** - Refactoring roadmap & analysis
- **CONTACTSTAB_REFACTOR_PLAN.md** - ContactsTab refactor (1,416→300 lines)
- **CONTACTSTAB_REFACTOR_PROGRESS.md** - Progress tracking (60% complete)
- **CONTACTVIEWPANEL_REFACTOR_PLAN.md** ⭐ **NEW** - ContactViewPanel (1,780→250 lines)
- **EMAILINBOX_REFACTOR_PLAN.md** ⭐ **NEW** - EmailInbox (1,562→300 lines)
- **COMPOSEPANEL_REFACTOR_PLAN.md** ⭐ **NEW** - ComposePanel (730→200 lines)
- **PWA_PUSH_NOTIFICATIONS_COMPLETE_GUIDE.md** - PWA push notifications
- **PWA_PUSH_TESTING_GUIDE.md** - Testing guide
- **SMS_PHASE2_TESTING.md** - SMS system testing
- **MESSAGES_REFACTOR_PLAN.md** - Messages page refactor (complete)
- **CONTACT_SYNC.md** - Google contacts synchronization

**Refactoring Initiative**: 7 components, 8,836 lines → target 77% reduction, 12-15 weeks

---

### [☁️ Deployment](./deployment/) - Infrastructure
Cloudflare deployment, PWA configuration, and security.

**Files**:
- **CLOUDFLARE_DEPLOYMENT_COMPLETE.md** - Cloudflare Pages guide
- **PWA_SETUP.md** - Progressive Web App config
- **SECURITY_AUDIT_2025-11-29.md** - Security audit
- **VPS_CLOSED_LISTINGS.md** ⭐ **New** - VPS deployment for closed listings

---

### [⚡ Features](./features/) - Application Features
Individual feature documentation.

**Files**:
- **SWIPE_SYSTEM.md** - Tinder-style swipe functionality
- **AUTHENTICATION.md** - NextAuth.js authentication
- **THEME_IMPLEMENTATION_GUIDE.md** - Dynamic theming
- **COMMUNITY_FACTS.md** - Community data integration
- **CMA_CLOSED_LISTINGS_STRATEGY.md** - Comparative Market Analysis
- **EXPIRED_LISTINGS_IMPLEMENTATION.md** - Expired listing handling
- **PROPERTY_SUBTYPE_FILTERING.md** ⭐ **New** - Property subtype filters

---

### [🔌 Integrations](./integrations/) - Third-Party Services ⭐ **NEW**
Documentation for external service integrations.

**Files**:
- **TWILIO.md** - Twilio SMS integration
- **dropcowboy/** - DropCowboy integration
  - **OVERVIEW.md** - DropCowboy summary
  - **BRAND_ID_GUIDE.md** - Brand ID configuration
  - **VOICEMAIL_SYSTEM.md** - Voicemail drop system

---

### [💻 Development](./development/) - Developer Guides ⭐ **NEW**
Guides for developers working on the platform.

**Files**:
- **ANALYTICS_PLUGIN_GUIDE.md** - How to create analytics plugins

---

### [💬 Chat System](./chat/) - AI Chat Architecture ⭐ **UPDATED DEC 19**
Component-first, intent-based real estate AI chat system.

**Architecture**: Intent classification → Single tool selection → Parameter return → Component data fetching

**Performance**: 200x faster (10+ seconds → 50ms tool execution)

**Files**:
- **README.md** - System overview & quick start
- **ARCHITECTURE.md** - Component-first architecture & data flow
- **INTENT_CLASSIFICATION.md** - Pattern matching & tool selection
- **TOOLS.md** - Tool development guide
- **TESTING.md** - Testing strategies & examples
- **TROUBLESHOOTING.md** - Common issues & solutions

**Recent Changes** (Dec 19, 2025):
- ✅ Deleted old query system (37 files, ~10,000 lines)
- ✅ Migrated to component-first architecture
- ✅ 11 user-first tools active
- ✅ Zero MongoDB timeout errors

---

### [📚 Misc](./misc/) - Reference Materials
Vision documents, analysis reports, and reference guides.

**Files**:
- **META_VISION.md** - Product vision and roadmap
- **REPLICATION_GUIDE.md** - Project replication guide
- **FLATTEN_PY_ANALYSIS.md** - Python script analysis

---

### [📸 Photos](./photos/) - Photo Management
Photo storage, optimization, and delivery.

**Files**:
- **HYBRID_PHOTO_STRATEGY.md** - Photo strategy
- **PHOTO_FIX_COMPLETE.md** - Photo system fixes

---

### [🐛 Debugging](./debugging/) - Debug & Testing
Debugging tools, test scripts, and issue investigation.

**Files**:
- **README.md** - Debugging guide
- **FILE_MODIFICATION_ERROR.md** - Common errors
- **testing/** ⭐ **New** - Test scripts archive
  - Contains all test scripts moved from project root
  - 23 test files for various components

---

### [📜 Historical](./historical/) - Archived Documentation ⭐ **NEW**
Completed work sessions, migration reports, and archived documentation.

**Files**:
- **2025-12-09/** - December 9 session archives
  - **session-summary.md** - AI analytics session
  - **integration-report.md** - Analytics integration
  - **test-readiness.md** - Test readiness report

---

## 🚀 Quick Start

### For New Developers
1. **System Overview**: [MASTER_SYSTEM_ARCHITECTURE.md](./architecture/MASTER_SYSTEM_ARCHITECTURE.md)
2. **Frontend Structure**: [FRONTEND_ARCHITECTURE.md](./architecture/FRONTEND_ARCHITECTURE.md)
3. **MLS Integration**: [UNIFIED_MLS_ARCHITECTURE.md](./listings/UNIFIED_MLS_ARCHITECTURE.md)

### For Map Development
1. **Latest Fixes**: [MAP_FIXES_COMPLETE.md](./map/MAP_FIXES_COMPLETE.md)
2. **Architecture**: [MAPPING_SYSTEM_ARCHITECTURE.md](./map/MAPPING_SYSTEM_ARCHITECTURE.md)

### For Feature Development
1. Check [Features](./features/) directory for specific feature docs
2. Review [DATABASE_MODELS.md](./architecture/DATABASE_MODELS.md) for data models

---

## 📊 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16.0.7 (Turbopack), React 19, TypeScript |
| **Database** | MongoDB (78,904+ unified listings from 8 MLSs) |
| **Maps** | MapLibre GL JS with server-side clustering |
| **AI** | Groq (Llama 3.3 70B), OpenAI GPT-4, Claude Sonnet 4.5 |
| **Auth** | NextAuth.js (OAuth + sessions) |
| **Deployment** | Cloudflare Pages |
| **Styling** | Tailwind CSS, Framer Motion |

---

## 🔄 Recent Changes

### April 10-12, 2026 ⭐ **LATEST**
- ✅ **Landing Pages (`/lp/`)** — Dedicated layout, form builder, theme override, agent footer
  - `LandingPageClient` replaces ArticlePageClient for `/lp/` routes
  - CMS form builder: radio, yes/no, checkbox with options, dropdown with options
  - Publishing pipeline writes form config + theme override to MDX frontmatter
  - Landing page footer with agent headshot, contact info, broker logo
  - Sidebar/nav hidden on `/lp/` routes via `ClientLayoutWrapper`
- ✅ **Agent Settings Wizard** (`/agent/settings`) — 7-step onboarding wizard
  - Steps: Identity, Branding, Photos, Content, Social, Domain/SEO, Service Areas
  - Per-step save via existing `PUT /api/user/profile` deep merge
  - Reusable `ImageUploadField` with Cloudinary integration
  - Branding step: font family, theme mode (both/light/dark), light+dark logo variants
  - Settings nav item added; dashboard slimmed from 1841→400 lines (edit mode extracted)
- ✅ **Subdivision CMA Components** — Pre-computed market analysis on neighborhood pages
  - API: `GET /api/cma/subdivision/[slug]` — pure findOne from pre-computed cmaStats
  - API: `GET /api/cma/subdivision/[slug]/narrative` — Groq-powered AI market narrative (cached 24h)
  - Sales history from `unified_closed_listings` (up to 50 recent, excludes Co-Ownership)
  - Components: MarketSnapshot, ActiveVsClosed (bar charts), SubTypeBreakdown (donut+bar), PriceMetrics (area chart), SalesTimeline (line chart), CompsTable (paginated cards with satellite thumbnails), QualityBadge, MarketNarrative
  - All charts use shadcn `ChartContainer`/`ChartConfig` pattern with recharts
  - Integrated into `SubdivisionPageClient` above the Buy/Sell CTA
- ✅ **Subdivision Buy/Sell Pages** — Rebuilt to mirror city buy/sell pages
  - Hero with listing photo slideshow from `/api/subdivisions/[slug]/listings`
  - Agent branding (headshot, name, brokerage, brand colors)
  - Reuses city components: MarketSnapshot, AgentValueProps, BuyingJourney, SellingJourney, IntakeCTAs
  - Fixed `params` to use `Promise<{}>` pattern (Next.js 15+)
- ✅ **shadcn CSS variable fix** — `.theme-lightgradient` now sets `--background: white` for proper tooltip rendering

### January 14, 2026
- ✅ **CRM Documentation Overhaul** - Comprehensive refactoring documentation
  - Created `CRM_DOCUMENTATION_INDEX.md` - Complete CRM system hub
  - Created `CRM_REFACTOR_PRIORITIES.md` - Analysis of 7 components (8,836 lines)
  - Detailed refactor plans for ContactViewPanel, EmailInbox, ComposePanel
  - 77% code reduction target across all components
  - 12-15 week refactoring roadmap established
- ✅ **ContactsTab Refactor** - 60% complete
  - Phase 1-3 done: Types, hooks, UI components
  - 16 useState hooks → 5 custom hooks
  - StatsCards and ContactToolbar components extracted

### December 19, 2025
- ✅ **Chat System Reorganization** - Complete documentation restructure
  - Created new `docs/chat/` directory with 6 comprehensive guides
  - Migrated from backend query system to component-first architecture
  - Deleted 18 outdated chat summary files from root docs/
  - Performance: 200x improvement (10s+ → 50ms tool execution)
  - Zero MongoDB timeout errors
  - 11 active user-first tools
- ✅ **Old Query System Cleanup** - Removed deprecated architecture
  - Deleted 37 files (~10,000 lines of code)
  - Removed `src/lib/queries/` directory (22 files)
  - Removed deprecated API endpoints (`/api/query`, `match-location`, `search-city`)
  - Removed deprecated tools (`executeQueryDatabase`, `matchLocation`, `searchCity`)
- ✅ **New Documentation Structure**
  - `chat/README.md` - Overview & quick start
  - `chat/ARCHITECTURE.md` - System design & data flow
  - `chat/INTENT_CLASSIFICATION.md` - Pattern matching guide
  - `chat/TOOLS.md` - Tool development guide
  - `chat/TESTING.md` - Testing strategies
  - `chat/TROUBLESHOOTING.md` - Common issues

### December 11, 2025
- ✅ **Query Performance Optimization** - 51s → 500ms (100x improvement)
  - Optimized regex queries for index usage
  - Created 34 database indexes (26 active + 8 closed)
  - Implemented Cloudflare KV caching layer
  - Dynamic TTL based on query type (2-10 minutes)
- ✅ **AI Chat Performance Analysis** - Analyzed 217 real user queries
  - Identified Palm Desert CC queries taking 86s → Now 500ms (172x faster)
  - 64.1% of queries under 3 seconds (good baseline)
  - Documented 5 priority optimizations for next sprint
  - Created performance monitoring scripts
- ✅ **Documentation Reorganization** - Complete restructure for clarity
- ✅ **New Directories**: integrations/, development/, historical/, debug/testing/
- ✅ **Deleted 7 outdated files** (completion reports & task lists)
- ✅ **Consolidated duplicates** (3 closed listings docs → 1, 2 analytics docs → 1)
- ✅ **Moved 23 test scripts** to debug/testing/
- ✅ **100% root cleanup** (23 files → 1 README)

### December 6, 2025
- ✅ **Map System Fixes** - Fixed server crashes + React duplicate key errors
- ✅ **Intelligent Prefetching** - 97% reduction in database queries (300+ → 9)
- ✅ **Proper React Keys** - Using `listingKey` (true business identifier)

### November 2025
- ✅ Unified MLS architecture (8 MLSs → 1 collection)
- ✅ Server-side clustering implementation
- ✅ Streaming response for large datasets

---

## 📝 Documentation Standards

All documentation follows these standards:
- **Date stamps** on major updates
- **Status indicators**: ✅ Complete, ⚠️ In Progress, ❌ Needs Update
- **Code examples** with file paths and line numbers
- **Clear problem → solution** structure
- **Security-first**: No real secrets, only placeholders

---

## 🗂️ File Count Summary

| Directory | Files | Purpose |
|-----------|-------|---------|
| Architecture | 13 | System design & infrastructure (+2 performance docs) |
| Map | 3 | Map system documentation |
| Listings | 4 | MLS data integration |
| CMS | 2 | Content management |
| AI | 1 | AI tools integration |
| CRM | 2 | Customer relationship management (+1 contact sync) |
| Deployment | 4 | Infrastructure & security (+1 VPS) |
| Features | 7 | Individual features (+1 property filtering) |
| **Integrations** | 4 | **Third-party services** |
| **Development** | 1 | **Developer guides** |
| **Chat** | 6 | **AI chat system (UPDATED DEC 19)** |
| Misc | 3 | Reference materials |
| Photos | 2 | Photo management |
| Debugging | 2 + 23 tests | Debug tools & test scripts |
| **Historical** | 3 | **Archived documentation (NEW)** |

**Total Active Docs**: ~55 files (organized in 15 directories)
**Root Files**: 1 (README.md only)

**Recent Deletions** (Dec 19, 2025): 18 outdated chat files removed

---

## 🔍 Finding Information

### By Topic
- **Chat system**: `./chat/README.md` ⭐ **UPDATED DEC 19**
- **Map issues**: `./map/MAP_FIXES_COMPLETE.md`
- **Database**: `./architecture/DATABASE_*.md`
- **MLS data**: `./listings/UNIFIED_MLS_ARCHITECTURE.md`
- **Analytics**: `./architecture/ANALYTICS_*.md`
- **Integrations**: `./integrations/`
- **Testing**: `./debugging/testing/`
- **Performance**: `./architecture/PERFORMANCE.md`
- **Deployment**: `./deployment/CLOUDFLARE_DEPLOYMENT_COMPLETE.md`

### By Date
All files include date stamps. Most recent updates marked with ⭐ emoji.

---

## 🛠️ System Overview

**jpsrealtor.com** is a Next.js 16 real estate platform for Joseph Sardella, specializing in California markets.

**Key Features**:
- 🏠 **78,904+ MLS listings** from 8 unified MLSs
- 💬 **AI-powered chat** with Groq (Llama 3.3 70B)
- 🗺️ **Interactive map** with intelligent clustering (zoom 4-13)
- 📱 **Swipe discovery** (Tinder-style for properties)
- 📝 **AI-driven CMS** with Claude Sonnet 4.5
- 🎨 **Dual themes** (blackspace / lightgradient)
- 📊 **Admin dashboard** with analytics
- 📈 **Real estate analytics** with appreciation calculations
- 📞 **CRM integration** with Twilio SMS & DropCowboy

---

## 🤝 Contributing

When adding new documentation:
1. **Place in appropriate directory** (architecture/integrations/development/etc.)
2. **Update this README** with link and description
3. **Include date stamp** in file header
4. **Follow documentation standards** (see above)
5. **Delete outdated docs** when superseded by new ones
6. **Security check** - No real secrets, only placeholders!
7. **Archive completed work** to historical/ directory

---

## 📞 Contact

**Joseph Sardella**
- 📧 Email: josephsardella@gmail.com
- 📱 Phone: (760) 833-6334
- 🌐 Website: https://jpsrealtor.com

---

**Last Security Audit**: November 29, 2025
**Last Documentation Reorganization**: December 19, 2025
**Last Chat System Update**: December 19, 2025
**All secrets sanitized and verified safe for public GitHub repository.**
