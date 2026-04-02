# CHAP: The First AI-Native Map Interface for Real Estate Discovery

**A White Paper on Conversational Hypermedia for Autonomous Property Search**

**Author**: Joseph Sardella, ChatRealty.io
**Date**: April 2026
**Version**: 1.0

---

## Abstract

CHAP (Chat + Map) is a unified interface that enables artificial intelligence to directly query, interpret, and render geospatial real estate data in response to natural language input. Unlike conventional chatbots that return static text, or search portals that require manual filter manipulation, CHAP bridges conversational AI with a live MLS database and interactive map — allowing users to discover properties through dialogue while simultaneously viewing results in geographic context.

This paper documents the architecture, technical innovations, and design philosophy behind what we believe is the first successfully deployed system where an AI agent directly interfaces with a mapping database to serve interactive, real-time property results to end users.

---

## 1. The Problem

Real estate search has been trapped between two paradigms for over a decade:

**The Search Portal** (Zillow, Redfin, Realtor.com): Users manipulate filters — price sliders, bedroom dropdowns, polygon drawing tools — to narrow listings on a map. This works for users who know exactly what they want, but fails the majority who approach home buying with vague, evolving criteria: *"something in a golf community under 600k"* or *"where are the best neighborhoods for families near good schools?"*

**The Chatbot** (various IDX tools): Users type questions and receive text responses. These systems either return canned answers from a knowledge base or, in more sophisticated implementations, query a database and return formatted text. The fundamental limitation is that the response medium — text — cannot convey spatial relationships, relative positioning, or the "feel" of a neighborhood.

Neither paradigm solves the actual user need: **exploring real estate as a conversation while seeing results in geographic context.**

---

## 2. What CHAP Is

CHAP is a layered interface where conversational AI and an interactive map occupy the same screen space, transitioning between each other through a cinematic wipe animation. The chat is the default view — a full-screen conversational interface rendered over the platform's spatial background. When the AI returns location-based results, or the user explicitly opens the map, a `clip-path` transition (1500ms ease-in-out) wipes the map into view as a full-screen overlay, expanding from a center horizontal line outward. The chat remains in the DOM beneath the map, preserving conversation state, and the user can toggle back instantly.

This is not a split-screen or sidebar layout. The map is not a panel — it is a **layer** that the AI can summon. The transition is the interface metaphor: the AI's response literally transforms the screen from conversation to geography and back.

The key innovation is not the chat or the map individually — both exist in many products. The innovation is the **data pipeline** connecting them and the **transition layer** that makes the shift between dialogue and geography feel like a single fluid experience: when a user asks a question, the AI agent directly queries a unified MLS database spanning 8 associations, extracts statistical insights from the actual listing data, renders results as interactive map markers, and provides a swipeable discovery queue — all within a single conversational turn, in approximately 2 seconds.

### 2.1 A Typical Interaction

A user types: *"Show me homes in Indian Wells Country Club under $800k with pools"*

Within 2 seconds, the system:

1. **Recognizes the entity** "Indian Wells Country Club" as a subdivision (not a city, not an address) using a database-indexed location model — not keyword matching
2. **Queries the unified MLS database** across all 8 MLS associations with the appropriate filters (standardStatus: Active, propertyType: Residential, listPrice <= $800,000, pool: true, subdivisionName: Indian Wells Country Club)
3. **Calculates real statistics** from the matching listings: average price, median price, price range, HOA fee ranges, percentage of properties with pools/spas/views, property type breakdown with per-type pricing
4. **Streams a formatted response** that includes a market overview table, community insights extracted from the data, and triggers a listing carousel component
5. **Renders map markers** for all matching properties, centered on the subdivision's coordinates
6. **Initializes a swipe queue** containing every matching listing, allowing the user to browse through all results with a Tinder-style swipe interface

The user can continue the conversation: *"What about nearby communities with lower HOA fees?"* — and CHAP adjusts its query context while maintaining the previous results for comparison.

---

## 3. Technical Architecture

### 3.1 The Component-First Principle

The single most important architectural decision in CHAP is that **AI tools return parameters, not data.**

Early prototypes followed the conventional approach: the AI called a tool, the tool queried MongoDB, the database returned thousands of listing objects, the AI attempted to format this data into a response. This resulted in 10+ second response times, frequent MongoDB timeouts, and bloated token usage.

The production system inverts this flow:

```
Old (Failed):  AI → Tool → MongoDB query → Data blob → AI formats → Response
               Time: 10-15 seconds | Failures: frequent timeouts

New (CHAP):    AI → Tool → Parameters only → Frontend components fetch in parallel
               Time: ~2 seconds | Failures: eliminated
```

The AI receives statistical summaries and insight parameters (50ms), then frontend React components handle their own data fetching (500ms) in parallel with the streaming response (1000ms). This achieves a 200x performance improvement and eliminates the timeout failures that plagued the prototype.

### 3.2 Entity Recognition

CHAP does not use keyword lists or hardcoded location databases. Entity recognition is driven by a `LocationIndex` model in MongoDB — an indexed collection of every known location entity (cities, subdivisions, subdivision groups, counties, regions) with normalized names, aliases, and abbreviation mappings.

When a user mentions "PDCC," the entity recognizer queries this index and resolves it to "Palm Desert Country Club" (subdivision type, confidence 0.98) in under 50ms. This architecture means:

- **New locations are automatically recognized** when the MLS data pipeline adds them
- **Abbreviations and nicknames** work naturally ("PGA West," "BDCC," "Del Webb")
- **Subdivision groups** are detected automatically — "BDCC" matches "BDCC Bellissimo," "BDCC Castle," "BDCC Colonial," etc., and the system presents combined stats with the option to filter to specific sub-neighborhoods
- **Ambiguity is resolved** by listing count (a user saying "The Springs" gets "The Springs Country Club" in Rancho Mirage, not "Palm Springs," because the system knows the subdivision context from entity type)

### 3.3 The Tool System

CHAP exposes three tools to the AI model:

**searchHomes** — The primary tool (60% of queries). Accepts 20+ filter parameters including location, price range, beds/baths, square footage, lot size, pool, spa, view, fireplace, gated community, senior community, HOA constraints, directional filters (east/west/north/south of a street), and sort preferences. The tool executor:

1. Resolves the location entity
2. Builds a MongoDB aggregation query
3. Fetches a total count and a 50-listing sample
4. Calculates statistics: average/median/range pricing, property type breakdown with per-type $/sqft, HOA ranges, amenity percentages
5. Extracts insights: gating status, golf course presence, community features
6. Returns these parameters to the AI — not the raw listing data

**getAppreciation** — Market trend analysis (15% of queries). Returns historical appreciation rates, median price changes, and sales volume for a location over 1, 3, 5, or 10-year periods.

**searchArticles** — Educational content search (20% of queries). Searches the platform's article database for relevant content on topics like HOA rules, VA loans, energy costs, school districts, and investment strategies.

### 3.4 The System Prompt

The system prompt (375 lines) is the behavioral core of CHAP. Key design principles:

**Data-driven, not opinion-driven.** The AI is instructed to never describe a community as "prestigious" or "exclusive" — instead, it reports that "72% of properties have pools, HOA ranges from $125-$550/month, and the community features a Jack Nicklaus-designed golf course." Facts extracted from the actual listing data replace marketing language.

**Location-type-aware responses.** The system prompt differentiates between subdivision queries and city queries. For subdivisions, the AI provides structured data tables (stats, property types, amenities). For cities, it provides narrative descriptions (lifestyle, schools, proximity benefits). This distinction reflects how users think about these different geographic levels.

**Component markers.** The AI embeds markers like `[LISTING_CAROUSEL]` in its response text. The frontend parser detects these markers and renders the corresponding React component (carousel, appreciation chart, article results) inline with the conversation text. This allows the AI to produce rich, interactive responses without needing to generate HTML or component code.

### 3.5 Streaming Architecture

CHAP uses Server-Sent Events (SSE) for response streaming. The flow:

1. Tool execution completes (non-streaming, ~50ms)
2. Tool results are appended to the message history
3. A second AI call streams the response token-by-token
4. Each token is sent as an SSE chunk: `data: { token: "text" }`
5. The frontend accumulates tokens, parses component markers, and renders incrementally
6. When streaming completes: `data: { done: true }`

This provides a responsive, conversational feel — the user sees the response building in real-time rather than waiting for a complete response.

---

## 4. The Map Integration

### 4.1 The Layered Architecture

The CHAP page renders three fixed layers, stacked by z-index:

1. **Layer 0**: `SpaticalBackground` — the platform's animated spatial background (gradient particles, stars, or light theme gradient). Always present, always behind everything.
2. **Layer 1**: `MapLayer` — a full-screen MapLibre GL map with listing markers, clustering, and search. Controlled by a `clip-path` CSS property that determines visibility.
3. **Layer 2**: `ChatWidget` — the conversational interface, rendered above both backgrounds. When the map is visible, the chat's `pointerEvents` are set to `'none'` so clicks pass through to the map beneath.

The map is always mounted in the DOM — it is never remounted or destroyed when toggling. The `clip-path` transition handles all visibility:

```css
/* Map hidden — clipped to an invisible horizontal line at center */
clip-path: inset(50% 0% 50% 0%);

/* Map visible — fully revealed */
clip-path: inset(0% 0% 0% 0%);

/* Transition: 1500ms ease-in-out wipe animation */
transition: clip-path 1500ms ease-in-out;
```

This creates a cinematic "reveal" effect — the map wipes open from the center of the screen, as if the conversation itself is parting to reveal the geographic layer beneath.

### 4.2 The "Open in Map View" Transition

After a listing search, the chat displays an "Open in Map View" button showing the total result count. Clicking it:

1. Pre-positions the map at the search location's coordinates with appropriate zoom
2. Triggers the clip-path wipe animation (1500ms)
3. Renders all listing markers on the map
4. Disables chat pointer events so the user can interact with the map
5. Shows the map search bar and filter controls

The URL updates from `/chap` to `/chap?view=map` for state persistence — if the user refreshes, they return to the map view at the same location.

To return to chat, the user clicks a chat icon or navigates back. The map wipes closed (reverse animation) and the full chat history is exactly as they left it. No data is refetched, no components are remounted.

### 4.3 Map-to-Chat Flow

The map search bar supports an "Ask AI" option. When a user searches for a location using the map search bar and selects "Ask AI," the system sends a location snapshot to the chat, which triggers a brief 2-3 sentence overview of the area. The map remains visible — the AI's response appears as a notification toast, allowing map-first users to get AI context without leaving the map view.

### 4.4 Mobile Behavior

On mobile, the transition is a full-screen toggle. The chat and map each occupy 100% of the viewport. A search icon in the chat view opens the map; a chat icon in the map view returns to chat. Both views persist in the DOM for instant switching with zero load time.

---

## 5. The Swipe Discovery System

### 5.1 Dual Queue Strategy

CHAP implements two distinct queue strategies through a pluggable strategy pattern:

**ChatQueueStrategy** — Activated when a user clicks "View Details" on a listing from a chat search result. Initializes with ALL listings matching the search criteria (not just the sample shown in the carousel). The queue is price-sorted and filterable. Users can swipe through every property in a subdivision.

**MapQueueStrategy** — Activated when a user clicks a marker on the map. Initializes with listings within a 5-mile radius, weighted by proximity. The queue is distance-sorted.

Both strategies feed into the same ListingBottomPanel, which provides:
- Swipe right to favorite (green indicator)
- Swipe left to dismiss (red indicator, removed from queue)
- Property details: photo, price, address, beds/baths/sqft, days on market, HOA
- Navigation buttons for next/previous
- End-of-queue modal with session statistics

### 5.2 Session Persistence

Chat messages persist in sessionStorage with a 5-minute expiration window. Each new message resets the expiration timer. This provides conversational continuity for active sessions without accumulating stale data. Favorites persist separately through the user's authenticated session.

---

## 6. Data Infrastructure

### 6.1 Unified Listing Collection

CHAP queries a single MongoDB collection (`unified_listings`) that aggregates data from 8 MLS associations: GPS, CRMLS, CLAW, Southland, High Desert, Bridge, Conejo/Simi/Moorpark, and iTech. The unification pipeline normalizes field names, deduplicates cross-listed properties, and maintains freshness through scheduled replication from the Spark API.

Each listing contains 30+ fields: identification (listingKey, mlsId, slugAddress), location (coordinates, city, subdivision), pricing (listPrice, originalListPrice, pricePerSqft), property details (beds, baths, livingArea, lotSize, yearBuilt), features (pool, spa, view, fireplace, garage), status (standardStatus, daysOnMarket), and media references (primaryPhoto, media array).

### 6.2 Photo Pipeline

Listing photos are fetched on-demand from the Spark Replication API rather than stored locally. Each photo request targets the correct MLS association using the listing's `mlsId`, ensuring photos come from the authoritative source. This eliminates stale photo URLs and reduces storage requirements.

### 6.3 Subdivision Intelligence

The `subdivisions` collection contains enriched metadata for 260+ communities across the Coachella Valley: coordinates, listing statistics, descriptions (sourced from official community websites via automated scraping), community features, HOA data, amenity information, and SEO keywords. This data enriches the AI's responses with community-level context that goes beyond individual listing attributes.

---

## 7. Performance Characteristics

| Metric | Value |
|---|---|
| Entity recognition | < 50ms |
| Tool execution (searchHomes) | ~ 50ms |
| AI response (streaming start) | ~ 1,000ms |
| Component data fetch | ~ 500ms |
| Total query-to-results | ~ 2 seconds |
| Map marker rendering | ~ 200ms |
| Swipe queue initialization | ~ 100ms |
| Improvement vs. prototype | 200x |
| MongoDB timeout errors | 0 (eliminated) |

---

## 8. What Makes This Different

### 8.1 AI as Interface, Not Feature

Most real estate platforms add AI as a feature — a chatbot in the corner, a "smart search" filter, an AI-generated property description. CHAP makes AI the primary interface. The map, the listings, the swipe queue — these are all output modalities of the conversational agent. The user's dialogue IS the search.

### 8.2 Real Data, Not Opinions

CHAP never says a community is "prestigious" or a home is "stunning." It says "72% of properties have pools, median price is $485,000, and HOA fees range from $50-$400/month." Every number comes from the actual listing data via aggregation pipeline, not from a training corpus or marketing copy. This makes the AI a trustworthy analytical tool rather than a sales assistant.

### 8.3 The Map Is Not a Visualization — It's a Database Interface

In traditional systems, the map visualizes pre-fetched results. In CHAP, the AI directly queries the geospatial database and the map renders the query results. The distinction matters: the map is not showing "listings near you" filtered by static parameters — it's showing the AI's interpretation of your natural language request, projected onto geographic space.

When a user says "show me golf communities east of Washington Street under $600k," the AI constructs a compound query (subdivisionName IN [golf communities], longitude > [Washington Street coordinate], listPrice <= 600000) and the map renders exactly those results. No manual filter adjustment required.

### 8.4 Subdivision Group Intelligence

CHAP automatically detects master-planned communities with multiple sub-neighborhoods. When a user asks about "Bermuda Dunes Country Club," the system recognizes that BDCC encompasses BDCC Bellissimo, BDCC Castle, BDCC Colonial, BDCC Villas, and others. It presents combined statistics for the entire community while offering the option to drill down into specific neighborhoods — a level of geographic intelligence that doesn't exist in filter-based search.

---

## 9. The Platform Context

CHAP is the flagship feature of ChatRealty.io, a multi-tenant real estate platform that operates as a cooperative agent network. Each agent on the platform gets their own branded instance of CHAP, connected to the same shared MLS data pool. The AI adapts its responses based on the agent's profile, service area, and specializations.

Custom domains can be pointed to specific community pages (e.g., `indianwellsccrealestate.com` → Indian Wells Country Club neighborhood page with CHAP access), enabling agents to capture organic search traffic for location-specific queries while providing an AI-powered search experience that no static landing page can match.

---

## 10. Conclusion

CHAP demonstrates that the natural interface for geographic property search is neither a form with filters nor a chatbot with text responses — it is a conversational agent with direct access to the spatial database, capable of rendering its understanding across multiple modalities simultaneously: text, maps, carousels, statistics, and swipeable discovery queues.

The technical insight that made this possible — tools that return parameters rather than data, letting frontend components handle their own fetching — is broadly applicable to any domain where AI needs to interface with large, queryable datasets. The 200x performance improvement over the naive approach (AI fetches and formats all data) suggests that this component-first architecture may be the correct pattern for production AI applications operating on real-time data.

We believe CHAP is the first system to successfully unify conversational AI with a live mapping database in a production real estate application. The result is not just a faster search tool — it's a fundamentally different way to explore real estate, one where the user thinks in questions and the system responds in geography.

---

## Technical Reference

| Component | Location | Lines |
|---|---|---|
| CHAP Page | `src/app/chap/page.tsx` | ~1,800 |
| Chat API | `src/app/api/chat-v2/route.ts` | ~500 |
| System Prompt | `src/lib/chat-v2/system-prompt.ts` | 375 |
| Tool Definitions | `src/lib/chat-v2/tools.ts` | 246 |
| Tool Executors | `src/lib/chat-v2/tool-executors.ts` | 647 |
| Entity Recognition | `src/lib/chat/utils/entity-recognition.ts` | ~300 |
| Chat UI Components | `src/app/components/chat/` | 6,908 |
| Map System | `src/app/components/mls/map/` | ~3,000 |
| Swipe Queue | `src/app/utils/swipe/` | ~500 |
| **Total System** | | **~14,000** |

**Technology Stack**: Next.js, React, TypeScript, MongoDB, Groq AI (GPT-OSS 120B), MapLibre GL, Framer Motion, Tailwind CSS, Server-Sent Events

**Data Coverage**: 8 MLS associations, 260+ subdivisions, 12 Coachella Valley cities

---

*ChatRealty.io — Where conversations become communities.*
