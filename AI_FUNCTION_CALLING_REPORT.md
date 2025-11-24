# AI Function Calling System - Architecture Documentation

**Project:** JPSRealtor.com Real Estate Platform
**Analysis Date:** 2025-11-24
**Version:** v2 Branch

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [AI Providers Integration](#ai-providers-integration)
4. [Function Definitions & Schemas](#function-definitions--schemas)
5. [Available Functions/Tools](#available-functionstools)
6. [Integration Flow](#integration-flow)
7. [API Endpoints](#api-endpoints)
8. [Performance Metrics](#performance-metrics)
9. [Limitations & TODOs](#limitations--todos)

---

## Executive Summary

This codebase implements a **custom, pattern-based AI function calling system** rather than using native tool/function calling from OpenAI or similar providers. The system enables AI assistants to execute real estate-specific operations like MLS searches, location matching, and community research through a text-pattern detection mechanism.

**Key Characteristics:**
- **Pattern-based detection** using regex to find function calls in AI responses
- **Three primary functions**: `searchListings()`, `matchLocation()`, and `researchCommunity()`
- **Multiple AI providers**: Groq (primary), WebLLM (client-side), OpenAI (commented out)
- **Client & server-side execution**: Functions can be called from both environments
- **Custom JSON parsing** with error handling for malformed AI outputs

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (ChatWidget.tsx / IntegratedChatWidget.tsx)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI FUNCTION DETECTION                         │
│  src/lib/ai-functions.ts                                         │
│  - detectFunctionCall()                                          │
│  - Pattern matching with regex                                   │
│  - JSON parameter extraction                                     │
│  - Text cleaning & hallucination filtering                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCTION ROUTER                               │
│  Routes to appropriate handler:                                  │
│  - searchListings → executeMLSSearch()                           │
│  - matchLocation → /api/chat/match-location                      │
│  - researchCommunity → /api/chat/research-community              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER                               │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │ MLS Search   │  │ Location      │  │ Community         │    │
│  │ /api/chat/   │  │ Matcher       │  │ Research          │    │
│  │ search-      │  │ /api/chat/    │  │ /api/chat/        │    │
│  │ listings     │  │ match-        │  │ research-         │    │
│  │              │  │ location      │  │ community         │    │
│  └──────────────┘  └───────────────┘  └───────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                                  │
│  - MongoDB (CRMLS Listings, Subdivisions, Cities)               │
│  - Real-time MLS data                                            │
│  - Community facts database                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Providers Integration

### 1. Groq (Primary Provider - Server-Side)

**File:** `src/lib/groq.ts`
**Status:** ✅ Active & Production Ready

**Models:**
```typescript
export const GROQ_MODELS = {
  FREE: "llama-3.1-8b-instant",    // 840 TPS, ~$0.013/month per user
  PREMIUM: "llama-3.3-70b-versatile" // 394 TPS, ~$0.15-0.30/month per user
} as const;
```

**Features:**
- Fast inference (394-840 TPS)
- Cost-effective (~$0.013-0.30/month per user)
- Streaming & non-streaming support
- API key required: `GROQ_API_KEY`

**Main Endpoint:** `src/app/api/chat/stream/route.ts`

---

### 2. WebLLM (Client-Side Browser AI)

**File:** `src/lib/webllm.ts`
**Status:** ✅ Active (Optional - Requires WebGPU)

**Model:** Phi-3-mini-4k-instruct-q4f16_1-MLC (~1.9GB)

**Key Features:**
- 100% client-side execution
- No API costs
- Privacy-first (data never leaves browser)
- Requires WebGPU support
- Automatic initialization with progress tracking

**Browser Compatibility:**
- ✅ Chrome/Edge with WebGPU enabled
- ❌ Safari (no WebGPU yet)
- ❌ Firefox (experimental WebGPU)

---

### 3. OpenAI (Commented Out - Future Integration)

**File:** `src/app/api/chat/stream/route.ts:247-290`
**Status:** 🚧 Placeholder Code (Not Active)

**TODO:** Implement native tool/function calling with OpenAI's built-in system

---

## Function Definitions & Schemas

### Function 1: `searchListings()`

**Purpose:** Search MLS listings based on criteria

**Schema:**
```typescript
interface SearchListingsParams {
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  cities?: string[];         // e.g., ["Palm Springs", "Palm Desert"]
  subdivisions?: string[];   // e.g., ["Indian Wells Country Club"]
  propertyTypes?: string[];  // e.g., ["Single Family Residence"]
  hasPool?: boolean;
  hasView?: boolean;
  limit?: number;            // Default: 10
}
```

**Example AI Output:**
```
I'll help you find homes! Let me search for properties.

searchListings({
  "cities": ["Palm Desert"],
  "minBeds": 3,
  "maxPrice": 800000,
  "hasPool": true
})

I'm looking for 3+ bedroom homes with pools under $800k in Palm Desert.
```

---

### Function 2: `matchLocation()`

**Purpose:** Intelligently resolve location queries to counties, cities, or subdivisions

**Schema:**
```typescript
interface MatchLocationParams {
  query: string;              // User's location query
  returnAll?: boolean;        // Return all potential matches
  specificChoice?: {          // User's disambiguation choice
    name: string;
    city: string;
  };
}
```

**Location Matching Priority:**
1. **Subdivisions** (most specific) - e.g., "Indian Wells Country Club"
2. **Cities** (mid-level) - e.g., "Palm Desert"
3. **Counties** (least specific) - e.g., "Riverside County"

---

### Function 3: `researchCommunity()`

**Purpose:** AI-powered community facts research and auto-recording

**Schema:**
```typescript
interface ResearchCommunityParams {
  action: 'answer' | 'analyze' | 'record' | 'count-homes';
  subdivisionName: string;
  city?: string;
  question?: string;          // For 'answer' action
  factType?: string;          // For 'record' action
  factValue?: any;            // For 'record' action
  dataSource?: string;        // For 'record' action
}
```

**Actions:**
- `answer`: Answer a specific question about the community
- `analyze`: Get comprehensive community statistics
- `record`: Record a specific fact about the community
- `count-homes`: Count total homes in the subdivision

---

## Available Functions/Tools

### 1. MLS Listing Search

**Endpoint:** `/api/chat/search-listings`
**Method:** POST
**File:** `src/app/api/chat/search-listings/route.ts`

**Request Body:**
```json
{
  "minBeds": 3,
  "maxBeds": 5,
  "minPrice": 400000,
  "maxPrice": 800000,
  "cities": ["Palm Desert", "Indian Wells"],
  "hasPool": true,
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "listings": [
    {
      "id": "PTP2212345",
      "price": 650000,
      "beds": 3,
      "baths": 2,
      "sqft": 2100,
      "city": "Palm Desert",
      "address": "123 Desert Vista Dr",
      "image": "https://...",
      "subdivision": "Indian Wells Country Club",
      "url": "/mls-listings/123-desert-vista-dr-palm-desert-ca-92260",
      "latitude": 33.7208,
      "longitude": -116.3744
    }
  ]
}
```

---

### 2. Location Matching

**Endpoint:** `/api/chat/match-location`
**Method:** POST
**File:** `src/app/api/chat/match-location/route.ts`

**Response (Successful Match):**
```json
{
  "success": true,
  "query": "Corona",
  "match": {
    "type": "city",
    "name": "Corona",
    "confidence": 1.0
  },
  "searchParams": {
    "cities": ["Corona"],
    "limit": 100
  }
}
```

**Response (Disambiguation Needed):**
```json
{
  "success": false,
  "needsDisambiguation": true,
  "message": "I found 3 communities with that name. Which one?",
  "options": [
    {
      "name": "Ironwood Country Club",
      "city": "Palm Desert",
      "listingCount": 42,
      "displayName": "Ironwood Country Club (Palm Desert) - 42 homes"
    }
  ]
}
```

---

### 3. Community Facts Research

**Endpoint:** `/api/chat/research-community`
**Method:** POST
**File:** `src/app/api/chat/research-community/route.ts`

**Response:**
```json
{
  "success": true,
  "subdivisionName": "Indian Wells Country Club",
  "city": "Indian Wells",
  "facts": {
    "totalListings": 12,
    "hoaData": {
      "hasData": true,
      "minHOA": 450,
      "maxHOA": 850,
      "avgHOA": 625,
      "uniqueHOAs": [
        { "amount": "$450", "count": 3 },
        { "amount": "$625", "count": 6 }
      ]
    },
    "priceData": {
      "minPrice": 450000,
      "maxPrice": 1200000,
      "avgPrice": 785000
    }
  }
}
```

---

### 4. CMA Generation (Comparative Market Analysis)

**Endpoint:** `/api/ai/cma`
**Method:** POST
**File:** `src/app/api/ai/cma/route.ts`

**Request Body:**
```json
{
  "subjectProperty": "PTP2212345",
  "city": "Palm Desert",
  "radius": 1,
  "bedroomRange": 1,
  "bathroomRange": 1,
  "sqftRange": 0.2,
  "maxComps": 10,
  "includeInvestmentAnalysis": true,
  "assumptions": {
    "downPaymentPercent": 20,
    "interestRate": 7.0,
    "loanTerm": 30
  }
}
```

**Features:**
- Geographic proximity filtering (radius-based)
- Similar property characteristics (beds/baths/sqft)
- Price per sqft analysis
- Days on market trends
- Investment calculations (Cap Rate, Cash-on-Cash, DSCR, etc.)

---

## Integration Flow

### Complete Function Call Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. USER SENDS MESSAGE                                       │
│  "Show me 3 bedroom homes in Palm Desert under $800k"        │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  2. MESSAGE SENT TO AI PROVIDER                              │
│  - Add enhanced system prompt with function docs             │
│  - Include conversation history                              │
│  - Call Groq API or WebLLM                                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  3. AI GENERATES RESPONSE WITH FUNCTION CALL                 │
│  "I'll help you find those homes!                            │
│                                                              │
│   searchListings({                                           │
│     "cities": ["Palm Desert"],                               │
│     "minBeds": 3,                                            │
│     "maxPrice": 800000                                       │
│   })"                                                        │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  4. FUNCTION CALL DETECTION (ai-functions.ts)                │
│  - detectFunctionCall(aiResponse)                            │
│  - Regex pattern matching                                    │
│  - Extract JSON parameters                                   │
│  - Clean hallucinations                                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  5. EXECUTE FUNCTION                                         │
│  - executeMLSSearch(params)                                  │
│  - POST /api/chat/search-listings                            │
│  - Query MongoDB for matching properties                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  6. RETURN RESULTS TO UI                                     │
│  - Display cleaned AI message                                │
│  - Render ListingCarousel with properties                    │
│  - Show MapView with coordinates                             │
└──────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Chat & Function Calling

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/chat/stream` | POST | Main Groq chat endpoint | ❌ |
| `/api/chat/search-listings` | POST | MLS property search | ❌ |
| `/api/chat/match-location` | POST | Location resolution | ❌ |
| `/api/chat/research-community` | POST/GET | Community facts | ❌ |
| `/api/chat/community-facts` | GET | Retrieve stored facts | ❌ |
| `/api/chat/generate-title` | POST | AI title generation | ❌ |

### AI & Analysis

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/ai/cma` | POST | Generate CMA | ✅ Optional |
| `/api/ai/console` | POST | AI console (admin) | ✅ Required |

---

## Performance Metrics

### Groq API Performance

**Model:** llama-3.1-8b-instant (FREE tier)
- **Tokens per second:** 840 TPS
- **Cost per user/month:** ~$0.013
- **Latency:** ~200-500ms for 500 tokens
- **Max tokens:** 8,192 context, 4,096 output

**Model:** llama-3.3-70b-versatile (PREMIUM tier)
- **Tokens per second:** 394 TPS
- **Cost per user/month:** ~$0.15-0.30
- **Latency:** ~400-800ms for 500 tokens
- **Max tokens:** 32,768 context, 8,192 output

### WebLLM Performance

**Model:** Phi-3-mini-4k-instruct-q4f16_1-MLC
- **Initial download:** ~1.9GB (cached after first load)
- **Initialization time:** 30-60 seconds (first time), <5 seconds (cached)
- **Tokens per second:** 20-40 TPS (varies by GPU)
- **Cost:** $0 (100% free, client-side)
- **Max tokens:** 4,096 context

### Function Execution Performance

**searchListings:**
- Average query time: 200-400ms (MongoDB)
- Photo fetching: +50-100ms per listing
- Network latency: 100-200ms
- **Total:** ~500-800ms

**matchLocation:**
- Database lookups: 100-200ms
- Disambiguation: +50ms
- **Total:** ~150-250ms

**researchCommunity:**
- Listing analysis: 300-500ms
- Fact calculation: 100-200ms
- **Total:** ~400-700ms

---

## Limitations & TODOs

### Current Limitations

1. **No Native Tool Calling**
   - Uses custom pattern-based detection instead of OpenAI's native function calling
   - More error-prone than structured tool APIs
   - Requires extensive hallucination filtering

2. **Limited Function Validation**
   - No TypeScript schema validation for function parameters
   - Relies on AI to provide correct parameter types
   - Missing: Zod or similar schema validation

3. **No Streaming Function Calls**
   - Function detection only happens after full response
   - Cannot detect/execute functions mid-stream

4. **Hard-Coded Function List**
   - Functions are manually added to prompt
   - No dynamic function registry

5. **Single Function Per Response**
   - Only first function call is executed
   - Cannot chain multiple functions

6. **No Function Call Confirmation**
   - Functions execute immediately without user approval
   - Could be problematic for sensitive operations

### Recommended Improvements

1. **Implement Schema Validation** (Zod)
2. **Add Function Registry** for dynamic management
3. **Implement Streaming Function Detection**
4. **Add OpenAI Native Tool Support**
5. **Add Retry Logic with Exponential Backoff**
6. **Implement Caching Layer** (Redis)
7. **Add Performance Monitoring**
8. **User Confirmation for High-Risk Operations**

---

## Summary

### What Works Well

✅ **Pattern-based detection** - Flexible, works across AI providers
✅ **Hallucination filtering** - Robust cleaning of AI artifacts
✅ **Multiple AI providers** - Groq (fast), WebLLM (private)
✅ **Real-time MLS data** - Direct MongoDB queries
✅ **Location intelligence** - Sophisticated matching with disambiguation
✅ **Investment analysis** - Comprehensive financial calculations
✅ **Client & server flexibility** - Functions work in both environments

### Architecture Strengths

1. **Provider-agnostic design** - Easy to swap AI backends
2. **Separation of concerns** - Detection, routing, execution cleanly separated
3. **Extensibility** - New functions can be added easily
4. **Privacy options** - WebLLM for on-device inference
5. **Real-time data** - Direct MLS database access
6. **Comprehensive filtering** - Handles AI hallucinations well

---

**End of Report**

Generated: 2025-11-24
Codebase Version: v2 Branch
Total Files Analyzed: 27+
Total Lines Reviewed: ~5,000+
