# 🗺️ JPSRealtor.com - Complete System Architecture Map

**Last Updated**: November 23, 2025 (Session: Build Fixes & ListingCarousel Debug)
**Version**: 0.1.0 (Production)
**Build Status**: ⚠️ TypeScript: 173 errors | ✅ Dev Server: Running | ✅ Core Features: Functional

## 📋 Recent Session Summary (Nov 23, 2025)

**Major Fix**: ✅ ListingCarousel bug resolved - properties now display correctly in chat
**Progress**: 100 TypeScript errors fixed (273 → 173)
**Deferred**: WebLLM removal (4-6 hrs), PayloadCMS migration (awaiting VPS mapping)
**Next Steps**: Fix remaining CMA type usage (~60 errors), complete import path fixes

See `local-logs/claude-logs/SESSION_MEMORY_2025-11-23.md` for complete session details.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Module Responsibilities](#module-responsibilities)
3. [Data Flow](#data-flow)
4. [Pipeline Diagrams](#pipeline-diagrams)
5. [Component Interactions](#component-interactions)
6. [Tech Stack Matrix](#tech-stack-matrix)

---

## 🎯 System Overview

JPSRealtor.com is a **multi-layered real estate platform** with these core subsystems:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  Next.js 16 (App Router) + React 19 + Tailwind + Framer Motion │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬────────────┬────────────┬───────────┐
    │                 │            │            │           │
┌───▼────┐  ┌─────────▼──┐  ┌──────▼─────┐ ┌───▼──────┐ ┌▼────────┐
│ Chat   │  │ Map System │  │ CMA Engine │ │ Auth     │ │Tutorial │
│ Widget │  │ (MapLibre) │  │ (Analytics)│ │ (Next    │ │ System  │
│        │  │ + Cluster  │  │ + PDF      │ │  Auth)   │ │         │
└────┬───┘  └─────┬──────┘  └──────┬─────┘ └────┬─────┘ └─────────┘
     │            │                 │            │
     │            │                 │            │
     └────────────┴─────────────────┴────────────┘
                       │
          ┌────────────▼───────────────┐
          │      API LAYER (Next.js)   │
          │  70+ REST Endpoints        │
          │  Function Calling (Groq)   │
          │  Middleware (Auth, CORS)   │
          └──────────┬─────────────────┘
                     │
       ┌─────────────┼──────────────┬──────────────┐
       │             │              │              │
  ┌────▼─────┐ ┌────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
  │ AI/LLM   │ │  MongoDB  │ │ External   │ │ Cloudinary│
  │ (Groq)   │ │  500k+    │ │ APIs       │ │ (Images)  │
  │ Llama 4  │ │  Listings │ │ (Maps, etc)│ │           │
  └──────────┘ └───────────┘ └────────────┘ └───────────┘
```

---

## 📦 Module Responsibilities

### 1. **Chat System** 🤖

**Purpose**: Conversational AI property search

**Components**:
- `IntegratedChatWidget.tsx` - Main chat UI
- `ChatProvider.tsx` - Session memory & MLS state
- `ListingCarousel.tsx` - Results display
- `MLSChatResponse.tsx` - Response formatting
- `AnimatedChatInput.tsx` - Input field
- `MessageBubble.tsx` - Message rendering

**APIs**:
- `/api/chat/stream` - AI streaming endpoint
- `/api/chat/match-location` - Location matcher
- `/api/chat/search-listings` - MLS search
- `/api/chat/history` - Chat history
- `/api/chat/research-community` - Community research

**Libraries**:
- `groq.ts` - Groq SDK wrapper
- `groq-functions.ts` - Function schemas
- `function-executor.ts` - Function dispatcher
- `location-matcher.ts` - Location resolution
- `ai-functions.ts` - MLS search functions
- `preference-engine.ts` - User preference AI
- `nlp-to-mls.ts` - Natural language parser

**Data Flow**:
```
User Input → NLP Parser → Intent Detection → Function Calling
                                                   ↓
                                          MongoDB Query
                                                   ↓
                                    Preference Filtering/Sorting
                                                   ↓
                                      Format Results → AI
                                                   ↓
                                      Natural Language Response
                                                   ↓
                                        Update Session Memory
                                                   ↓
                                       Display in Carousel
```

---

### 2. **Map System** 🗺️

**Purpose**: Interactive property visualization

**Components**:
- `MapPageClient.tsx` - Main map container
- `MapView.tsx` - MapLibre GL wrapper
- `Fresh.tsx` - Filter sidebar
- `AsidePreview.tsx` - Listing preview panel
- `MapGlobeLoader.tsx` - Loading state

**APIs**:
- `/api/map-tiles/[z]/[x]/[y]` - Tile system (GeoJSON)
- `/api/map/query` - Cluster queries
- `/api/mls-listings` - Listing search

**Libraries**:
- MapLibre GL 5.5.0 - WebGL mapping
- Supercluster 8.0.1 - Point clustering
- `use-supercluster` 1.2.0 - React hook
- `convertListingToGeoJson.ts` - Data transformer

**Tile System**:
```
Structure: public/tiles/[z]/[x]/[y].json

Zoom Levels:
z0-z5:   National/State view (clustering)
z6-z9:   County view (clustering)
z10-z13: Neighborhood view (individual pins)

Example: public/tiles/12/702/1635.json
{
  "type": "Feature",
  "properties": {
    "cluster": false,
    "listingKey": "...",
    "price": 850000,
    "beds": 3,
    "baths": 2.5,
    ...
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-116.316, 33.731]
  }
}
```

**Clustering Algorithm**:
```
if (zoom < 10) {
  Use Supercluster to group nearby points
  Display cluster count badges
} else {
  Show individual listing pins
  Color code by price range
}
```

---

### 3. **CMA Engine** 📊

**Purpose**: Comparative Market Analysis generation

**Components**:
- `calculateCMA.ts` - Core valuation
- `appreciationEngine.ts` - Historical trends
- `cashflowEngine.ts` - Investment metrics
- `forecastEngine.ts` - Price predictions
- `riskEngine.ts` - Risk assessment

**APIs**:
- `/api/cma/generate` - CMA generation
- `/api/cma/export` - PDF export

**Charts** (Recharts):
- `PriceRangeChart.tsx` - Price distribution
- `DaysOnMarket.tsx` - Absorption rate
- `PricePerSqftChart.tsx` - Sqft pricing
- `SalesVsExpired.tsx` - Market health
- `AnnualReview.tsx` - Yearly trends

**Calculation Flow**:
```
1. Subject Property Analysis
   - Parse address, price, sqft, features
   - Fetch comparable sales (3-mile radius, 6 months)
   - Calculate price adjustments

2. Valuation Range
   - Lower: Comparable sales - 5%
   - Middle: Average adjusted price
   - Upper: Comparable sales + 5%

3. Appreciation Analysis
   - Historical sales (last 5 years)
   - Year-over-year growth rate
   - Seasonal adjustments

4. Cash Flow Analysis
   - NOI = Gross Rent - Operating Expenses
   - Cap Rate = NOI / Property Value
   - CoC = Cash Flow / Cash Invested
   - DSCR = NOI / Debt Service

5. Forecast (5 years)
   - Linear regression on historical data
   - Compound annual growth rate (CAGR)
   - Conservative/Moderate/Optimistic scenarios

6. Risk Assessment
   - Market volatility score
   - Days on market trend
   - Price reduction frequency
   - Inventory levels

7. PDF Generation
   - Convert charts to images (Puppeteer)
   - Compile PDF report
   - Include all metrics + disclaimers
```

---

### 4. **Preference Engine** 🧠

**Purpose**: Learn user behavior and personalize results

**Components**:
- `preference-engine.ts` - Core AI logic
- `ChatProvider.tsx` - State management

**Functions**:
1. **extractPreferences()**
   - Input: Array of favorited listings
   - Output: PreferenceModel
   ```typescript
   {
     avgPrice: number,
     priceRange: { min, max },
     preferredCities: string[],
     preferredSubdivisions: string[],
     preferredBeds: number,
     preferredBaths: number,
     preferredSqft: number,
     preferredFeatures: string[], // pool, spa
     avoidedFeatures: string[],   // land-lease, high-hoa
     avgHOA: number
   }
   ```

2. **applyPreferencesToFilters()**
   - Modes: `augment` | `suggest` | `strict`
   - Augment: Add preferences to existing filters
   - Suggest: Use preferences as defaults
   - Strict: Enforce preferences as hard constraints

3. **findSimilarListings()**
   - Similarity scoring based on:
     - Price (±20% tolerance)
     - Bedrooms (exact match)
     - Bathrooms (±0.5 tolerance)
     - Sqft (±15% tolerance)
     - Same subdivision (+15 score)
     - Same city (+10 score)
     - Matching features (pool, spa, etc.)

4. **scoreListingRelevance()**
   - Scoring matrix:
     - Price in range: +10
     - Preferred city: +10
     - Preferred subdivision: +8
     - Matching beds: +7
     - Matching sqft: +6
     - Has pool (if preferred): +5
     - Has spa (if preferred): +3
     - Land lease (if avoided): -10
     - High HOA (if avoided): -5

5. **sortByPreference()**
   - Filter dismissed listings
   - Score each listing
   - Sort descending by score

6. **describePreferences()**
   - Generate human-readable summary
   - Example: "average price around $1.2M, 3 bedrooms, 3 bathrooms, in Indian Wells, Palm Desert, with pool, spa, around 2.8k sqft"

---

### 5. **Authentication System** 🔐

**Purpose**: User management and access control

**Components**:
- NextAuth 4.24.13
- `auth.ts` - NextAuth configuration
- `route.ts` - Auth API handler

**Flow**:
```
┌──────────────┐
│ User Signup  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Email Verification   │
│ - Send token via email│
│ - Link: /api/auth/verify?token=xxx │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 2FA Setup (Optional) │
│ - Enable via /api/auth/2fa/enable │
│ - Verify code on login │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Session Creation     │
│ - JWT token          │
│ - Database session   │
└──────────────────────┘
```

**APIs**:
- `/api/auth/register` - Create account
- `/api/auth/verify` - Verify email
- `/api/auth/resend-verification` - Resend token
- `/api/auth/2fa/enable` - Enable 2FA
- `/api/auth/2fa/send-code` - Send 2FA code
- `/api/auth/2fa/verify-code` - Verify code
- `/api/auth/2fa/disable` - Disable 2FA

**Protected Routes** (via middleware):
```
middleware.ts checks:
1. Is user authenticated?
2. Is email verified?
3. If 2FA enabled, is it verified?
4. Does user have required role?

Redirect to:
- /auth/signin (not authenticated)
- /auth/verify-email (not verified)
- /auth/2fa-verify (2FA pending)
```

---

### 6. **Tutorial System** 🎓

**Purpose**: Interactive onboarding for new users

**Components**:
- `TutorialManager.tsx` - State machine
- `TutorialSteps/` - Individual step components
- LocalStorage - Progress tracking

**Flow**:
```
Step 1: Welcome
  ↓
Step 2: Chat Demo
  ↓
Step 3: Map Introduction
  ↓
Step 4: Favorites System
  ↓
Step 5: CMA Introduction
  ↓
Completion: Get Started
```

**State Management**:
```typescript
{
  currentStep: number,
  completedSteps: number[],
  isActive: boolean,
  hasSeenTutorial: boolean
}
```

**Persistence**:
```
localStorage.setItem('tutorial_state', JSON.stringify({
  completedSteps: [1, 2, 3],
  hasSeenTutorial: true
}));
```

---

## 🔄 Data Flow

### Primary User Journeys

#### Journey 1: Property Search via Chat

```
User Types Query
      ↓
IntegratedChatWidget.tsx (handleSend)
      ↓
POST /api/chat/stream
      ↓
Groq API (with function schemas)
      ↓
AI Decides: matchLocation()
      ↓
function-executor.ts → location-matcher.ts
      ↓
MongoDB Query: subdivisions.findOne({ slug })
      ↓
Return: { type: "subdivision", slug: "palm-desert-country-club" }
      ↓
Groq receives result
      ↓
AI Decides: getSubdivisionListings()
      ↓
function-executor.ts → ai-functions.ts → executeMLSSearch()
      ↓
MongoDB Query: listings.find({ subdivisionName: "..." })
      ↓
preference-engine.ts: sortByPreference()
      ↓
Return: 20 sorted listings
      ↓
Groq generates natural language response
      ↓
Response sent to client
      ↓
ChatProvider: setLastSearch() (session memory)
      ↓
ListingCarousel: Display listings
      ↓
User can:
  - View property details
  - Favorite listings
  - View on map
  - Generate CMA
```

#### Journey 2: Map Exploration

```
User Opens /map
      ↓
MapPageClient.tsx (useEffect)
      ↓
Fetch tiles: /api/map-tiles/12/702/1635
      ↓
Load GeoJSON from public/tiles/
      ↓
Parse features → GeoJSON points
      ↓
Supercluster: cluster(points, { radius: 40, maxZoom: 13 })
      ↓
MapView: Render clusters as circle markers
      ↓
User clicks cluster
      ↓
Zoom in → Supercluster recalculates
      ↓
Eventually: Individual listings visible
      ↓
User clicks listing pin
      ↓
AsidePreview: Display listing detail
      ↓
User can:
  - Favorite
  - View full details (/mls-listings/[slug])
  - Share
  - Navigate to subdivision page
```

#### Journey 3: CMA Generation

```
User Views Listing Detail Page
      ↓
Click "Generate CMA"
      ↓
POST /api/cma/generate
      ↓
calculateCMA.ts
      ↓
Step 1: Find Comparables
  - MongoDB Query: {
      city: subjectProperty.city,
      listPrice: { $gte: min, $lte: max },
      bedsTotal: subjectProperty.beds,
      closeDate: { $gte: last6Months }
    }
      ↓
Step 2: Calculate Adjustments
  - Sqft difference × $pricePerSqft
  - Pool? +$50k
  - Spa? +$15k
  - Golf course lot? +$100k
      ↓
Step 3: Valuation Range
  - Lower: Min adjusted price - 5%
  - Middle: Avg adjusted price
  - Upper: Max adjusted price + 5%
      ↓
Step 4: Appreciation Analysis
  - appreciationEngine.ts: Historical trends
  - Calculate CAGR (Compound Annual Growth Rate)
      ↓
Step 5: Cash Flow Analysis
  - cashflowEngine.ts: NOI, Cap Rate, CoC, DSCR
      ↓
Step 6: Forecast
  - forecastEngine.ts: 5-year projections
      ↓
Step 7: Risk Assessment
  - riskEngine.ts: Market volatility score
      ↓
Step 8: Chart Generation
  - Recharts components → Puppeteer screenshot
      ↓
Step 9: PDF Compilation
  - pdfTemplates.ts: Assemble report
      ↓
Return CMA JSON + PDF Buffer
      ↓
User can:
  - View CMA in browser
  - Download PDF
  - Email to client
  - Share via link
```

---

## 📊 Pipeline Diagrams

### Chat → AI Engine → Map → CMA Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│  "Show me 3-bed homes under $1M in Indian Wells with a pool"    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                ┌────────▼─────────┐
                │   NLP Parser     │
                │ (nlp-to-mls.ts)  │
                └────────┬─────────┘
                         │
              ┌──────────▼───────────┐
              │  Intent Detection    │
              │  - new_search        │
              │  - refinement        │
              │  - similar_listing   │
              │  - preference_rec    │
              └──────────┬───────────┘
                         │
           ┌─────────────▼─────────────┐
           │   Groq Function Calling   │
           │   (Llama 4 Scout 17B)     │
           └─────────────┬─────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼─────────┐             ┌─────────▼─────────┐
   │ matchLocation│             │  searchListings   │
   │              │             │                   │
   │ MongoDB:     │             │  MongoDB:         │
   │ subdivisions │             │  listings         │
   │ cities       │             │                   │
   └────┬─────────┘             └──────────┬────────┘
        │                                  │
        │         ┌────────────────────────┘
        │         │
        └─────────▼──────────────┐
                  │              │
           ┌──────▼──────────┐   │
           │ Preference AI   │   │
           │ - Filter        │   │
           │ - Sort          │   │
           │ - Score         │   │
           └──────┬──────────┘   │
                  │              │
                  └──────┬───────┘
                         │
                  ┌──────▼──────────┐
                  │  Format Results │
                  │  for Groq       │
                  └──────┬──────────┘
                         │
                  ┌──────▼──────────┐
                  │ Groq Generates  │
                  │ Natural Language│
                  │ Response        │
                  └──────┬──────────┘
                         │
       ┌─────────────────┴──────────────────┐
       │                                    │
   ┌───▼──────────┐              ┌──────────▼────────┐
   │ Chat Widget  │              │  Update Session   │
   │ Display      │              │  Memory           │
   │ - Listings   │              │  - lastSearch     │
   │ - Carousel   │              │  - preferences    │
   │ - Map Link   │              │  - favorites      │
   └───┬──────────┘              └───────────────────┘
       │
       │  User clicks "View on Map"
       │
   ┌───▼─────────────────────────────────────────────┐
   │              MAP INTEGRATION                     │
   │                                                  │
   │  URL: /map?bounds={...}&listingKeys=[...]       │
   │                                                  │
   │  MapPageClient:                                 │
   │  - Parse bounds from URL                        │
   │  - Fetch tiles                                  │
   │  - Cluster listings                             │
   │  - Zoom to bounds                               │
   │  - Highlight selected listings                  │
   └───┬─────────────────────────────────────────────┘
       │
       │  User clicks listing → View Details
       │
   ┌───▼─────────────────────────────────────────────┐
   │           LISTING DETAIL PAGE                    │
   │                                                  │
   │  /mls-listings/[slugAddress]                    │
   │                                                  │
   │  - Photos gallery                               │
   │  - Property details                             │
   │  - Neighborhood stats                           │
   │  - School ratings                               │
   │  - CMA button                                   │
   └───┬─────────────────────────────────────────────┘
       │
       │  User clicks "Generate CMA"
       │
   ┌───▼─────────────────────────────────────────────┐
   │              CMA ENGINE                          │
   │                                                  │
   │  1. Fetch comparables (MongoDB)                 │
   │  2. Calculate adjustments                       │
   │  3. Valuation range                             │
   │  4. Appreciation analysis                       │
   │  5. Cash flow metrics                           │
   │  6. Forecast (5 years)                          │
   │  7. Risk assessment                             │
   │  8. Generate charts (Recharts)                  │
   │  9. Export PDF (Puppeteer)                      │
   └───┬─────────────────────────────────────────────┘
       │
   ┌───▼─────────────────────────────────────────────┐
   │         CMA REPORT (PDF + JSON)                  │
   │                                                  │
   │  User can:                                      │
   │  - View in browser                              │
   │  - Download PDF                                 │
   │  - Email to client                              │
   │  - Share link                                   │
   └─────────────────────────────────────────────────┘
```

---

## 🔗 Component Interactions

### Chat ↔ Map Sync

**Scenario**: User searches in chat, views results on map

```
ChatProvider.tsx
  ├── setLastSearch({ filters, query, listings, bounds })
  │     └── localStorage.setItem('mls_session', ...)
  │
  └── User clicks "View on Full Map"
        └── ChatMapView.tsx
              └── Builds URL: /map?bounds={north,south,east,west}&listingKeys=[...]
                    └── Router.push(url)
                          └── MapPageClient.tsx
                                ├── Read bounds from URL params
                                ├── Read listingKeys from URL params
                                ├── Fetch tiles for bounds
                                ├── map.fitBounds(bounds)
                                └── Highlight listings with matching keys
```

**Reverse Flow**: User favorites on map, sees in chat carousel

```
MapView.tsx
  ├── User clicks favorite button
  │     └── MLSProvider.toggleFavorite(listing)
  │           └── localStorage.setItem('liked_listings', ...)
  │
  └── User opens chat
        └── ListingCarousel.tsx
              ├── useChatContext() → mlsState.favorites
              ├── useMLSContext() → likedListings
              ├── isFavorited() checks BOTH providers
              └── Heart icon shows filled state
```

### Preference Learning Flow

```
User Favorites Listing #1
      ↓
ChatProvider.addFavorite()
      ↓
extractPreferences([listing1])
      ↓
preferenceModel: {
  avgPrice: 850000,
  preferredBeds: 3,
  preferredCities: ["Indian Wells"]
}
      ↓
localStorage.setItem('mls_session', ...)
      ↓
User Favorites Listing #2
      ↓
ChatProvider.addFavorite()
      ↓
extractPreferences([listing1, listing2])
      ↓
preferenceModel: {
  avgPrice: 925000,  // Updated average
  priceRange: { min: 850000, max: 1000000 },
  preferredBeds: 3,
  preferredCities: ["Indian Wells", "Palm Desert"],
  preferredFeatures: ["pool"]  // Both have pools
}
      ↓
User says "show me more homes"
      ↓
IntegratedChatWidget detects vague query
      ↓
applyPreferencesToFilters({}, preferenceModel, 'suggest')
      ↓
suggestedFilters: {
  minPrice: 850000,
  maxPrice: 1000000,
  minBeds: 3,
  cities: ["Indian Wells", "Palm Desert"],
  poolYn: true
}
      ↓
executeMLSSearch(suggestedFilters)
      ↓
Results sorted by preference (sortByPreference)
      ↓
User sees personalized recommendations
```

---

## 🛠️ Tech Stack Matrix

| Layer | Technology | Purpose | Version |
|-------|-----------|---------|---------|
| **Frontend Framework** | Next.js | App Router, SSR, API routes | 16.0.3 |
| | React | UI library | 19.2.0 |
| | TypeScript | Type safety | 5.7.2 |
| **Styling** | Tailwind CSS | Utility-first CSS | 3.4.1 |
| | Framer Motion | Animations | 12.17.0 |
| | ShadCN/UI | Component library | Latest |
| **State Management** | React Context | Global state | Built-in |
| | LocalStorage | Persistence | Browser API |
| **Maps** | MapLibre GL | WebGL mapping | 5.5.0 |
| | Supercluster | Point clustering | 8.0.1 |
| | React Map GL | React bindings | 8.0.4 |
| **Charts** | Recharts | Data visualization | 2.15.4 |
| | Puppeteer | Chart → Image conversion | 23.11.1 |
| **3D Graphics** | Three.js | 3D rendering | 0.167.1 |
| | React Three Fiber | React bindings | 8.17.5 |
| **AI/LLM** | Groq SDK | LLM API client | 0.35.0 |
| | Llama 4 Scout | AI model (17B params) | Latest |
| | Llama 3.3 70B | Backup model | Latest |
| **Database** | MongoDB | NoSQL database | 6.16.0 |
| | Mongoose | ODM | 8.15.1 |
| **Authentication** | NextAuth | Auth provider | 4.24.13 |
| | bcryptjs | Password hashing | 3.0.3 |
| | JWT | Token generation | 9.0.2 |
| **Email** | Resend | Transactional email | 6.4.2 |
| | Nodemailer | Email sending | 6.9.16 |
| **File Storage** | Cloudinary | Image hosting | 2.5.1 |
| **API Integrations** | Google Maps API | Geocoding, Street View | - |
| | Yelp API | Business search | - |
| | RunwayML | Video generation | 2.3.0 |
| **PWA** | next-pwa | Progressive Web App | 5.6.0 |
| **Build Tools** | Turbopack | Fast bundler | Built-in |
| | SWC | Fast compiler | Built-in |

---

## 📈 Performance Metrics

### Current Performance

- **Homepage**: 95+ Lighthouse score
- **Map Load Time**: <2 seconds (with tiles)
- **AI Response Time**: 5-20 seconds (depends on Groq)
- **CMA Generation**: 10-30 seconds
- **Database Queries**: <100ms (with indexes)

### Optimization Strategies

1. **Tile Pre-computation**: 100k+ tiles stored statically
2. **Bundle Splitting**: Separate chunks for heavy libs (Three.js, MapLibre)
3. **Lazy Loading**: Dynamic imports for charts, 3D, etc.
4. **Image Optimization**: Next.js Image component + Cloudinary
5. **MongoDB Indexes**: 20+ optimized indexes
6. **Caching**: LocalStorage for session state, browser cache for tiles

---

## 🔐 Security Architecture

### Authentication Flow

```
Registration
  └→ Email verification required
       └→ Token stored in MongoDB
            └→ Email sent via Resend
                 └→ User clicks link
                      └→ Account activated
                           └→ Optional: Enable 2FA
                                └→ Email code on login
```

### Protected Routes

```
middleware.ts checks:
├── Session exists? (NextAuth)
├── Email verified? (users.emailVerified)
├── 2FA required? (users.twoFactorEnabled)
│     └→ If yes: 2FA verified? (session.twoFactorVerified)
└── Role check (users.role === "admin")
```

### API Security

```
All /api routes:
├── CORS middleware (nextjs-cors)
├── Rate limiting (TODO: implement)
├── Input validation (Zod schemas)
├── SQL injection prevention (Mongoose escapes)
├── XSS prevention (React escapes by default)
└── CSRF protection (NextAuth built-in)
```

---

## 📁 Key File Locations

### Core API Routes

```
src/app/api/
├── chat/stream/route.ts           # Main AI endpoint
├── chat/match-location/route.ts   # Location matcher
├── cma/generate/route.ts           # CMA generation
├── map-tiles/[z]/[x]/[y]/route.ts  # Tile system
└── auth/[...nextauth]/route.ts     # Authentication
```

### Core Libraries

```
src/lib/
├── groq.ts                   # Groq API wrapper
├── groq-functions.ts         # Function schemas
├── function-executor.ts      # Function dispatcher
├── location-matcher.ts       # Location resolver
├── ai-functions.ts           # MLS search functions
├── ai/
│   ├── nlp-to-mls.ts         # NLP parser
│   └── preference-engine.ts  # Preference AI
└── cma/
    ├── calculateCMA.ts       # CMA engine
    ├── appreciationEngine.ts
    ├── cashflowEngine.ts
    ├── forecastEngine.ts
    └── riskEngine.ts
```

### Core Components

```
src/app/components/
├── chatwidget/
│   └── IntegratedChatWidget.tsx  # Main chat UI
├── chat/
│   ├── ChatProvider.tsx          # Session memory
│   └── ListingCarousel.tsx       # Results display
└── mls/map/
    ├── MapPageClient.tsx         # Main map
    └── MapView.tsx               # MapLibre wrapper
```

---

**END OF ARCHITECTURE DOCUMENT**

*For implementation details, see `README.md`*
*For API reference, see `docs/API_REFERENCE.md`*
*For debugging guide, see README.md § Debugging*
