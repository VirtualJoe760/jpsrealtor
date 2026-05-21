# Comparative Market Analysis (CMA) Architecture

## Overview

The CMA system generates branded, theme-aware Comparative Market Analyses for residential properties. It queries active listings from `unified_listings` and closed/sold listings from `unified_closed_listings` to find the best comparable properties, then presents the data in tables and charts using shadcn/ui components and Recharts.

The system is designed with a **pluggable hierarchy** so it can be consumed by:
1. **Listing page utility** — auto-generates a CMA for the subject property
2. **Chat tool** — AI agent calls the CMA engine on demand, returns formatted analysis + narrative
3. **Standalone CMA page** — full-page report for agents to share with clients

---

## Data Sources

| Collection | Purpose | Key Fields |
|---|---|---|
| `unified_listings` | Active/pending listings for "Active Comps" section | listPrice, livingArea, bedsTotal, bathsTotal, poolYn, spaYn, garageSpaces, subdivisionName, lotSizeArea, yearBuilt |
| `unified_closed_listings` | Sold properties for "Closed Comps" section | closePrice, closeDate, daysOnMarket, salePricePerSqft, listPrice, originalListPrice + all fields above |

Both collections have compound indexes on `{subdivisionName, closeDate}`, `{city, closeDate}`, `{latitude, longitude, closeDate, propertyType}`, and a 2dsphere geospatial index on `coordinates`.

Existing aggregator: `src/lib/analytics/aggregators/closed-sales.ts` — already supports filtering by subdivision, city, radius, beds/baths, sqft range, price range, property type, and time period.

---

## CMA Tiers

Properties are classified into tiers that adjust comparison parameters:

### Affordable (List price < $500K, OR sqft < 1,500)
| Parameter | Value |
|---|---|
| Sqft range | subject sqft +/- 300 |
| Lot tolerance | +/- 2,000 sqft |
| Year built tolerance | +/- 15 years |
| Max comps per status | 5 |
| Comp search radius fallback | 3 miles |
| Pool/spa matching | Preferred, not required |

### Residential (List price $500K - $1.5M, OR sqft 1,500 - 3,000)
| Parameter | Value |
|---|---|
| Sqft range | subject sqft +/- 400 |
| Lot tolerance | +/- 3,000 sqft |
| Year built tolerance | +/- 10 years |
| Max comps per status | 5 |
| Comp search radius fallback | 2 miles |
| Pool/spa matching | Required if subject has pool/spa |

### Luxury (List price > $1.5M, OR sqft > 3,000)
| Parameter | Value |
|---|---|
| Sqft range | subject sqft +/- 600 |
| Lot tolerance | +/- 5,000 sqft |
| Year built tolerance | +/- 10 years |
| Max comps per status | 5 |
| Comp search radius fallback | 5 miles |
| Pool/spa matching | Required if subject has pool/spa |
| View matching | Preferred (golf course, mountain, etc.) |

---

## Comparable Selection Hierarchy

The engine searches for comps in a strict hierarchy, relaxing criteria at each level if insufficient comps are found (target: 5 per status).

### Level 1 — Same Subdivision + Tight Match
```
subdivision = subject.subdivisionName
AND propertyType = subject.propertyType
AND bedsTotal = subject.bedsTotal (+/- 1)
AND bathsTotal = subject.bathsTotal (+/- 1)
AND livingArea BETWEEN (subject.livingArea - tier.sqftRange, subject.livingArea + tier.sqftRange)
AND poolYn = subject.poolYn (if subject has pool, only match pool homes)
AND spaYn = subject.spaYn (if subject has spa, only match spa homes)
AND closeDate >= 6 months ago (closed) OR standardStatus = "Active" (active)
```

### Level 2 — Same Subdivision + Relaxed
- Expand sqft range by 50%
- Expand closeDate to 12 months
- Drop pool/spa requirement (note in limitations)
- Drop bed/bath +/- 1 to +/- 2

### Level 3 — Same City + Tight Match
- Drop subdivision filter, use city
- Restore tight sqft/bed/bath parameters
- Restore pool/spa matching

### Level 4 — Same City + Relaxed
- Use city
- Expand sqft, bed/bath, pool/spa relaxed
- Expand closeDate to 24 months

### Level 5 — Radius Fallback
- Use geospatial query with tier.radiusMiles
- Most relaxed parameters
- Expand closeDate to 36 months

At each level, results are **scored and ranked** by similarity to the subject property.

---

## Data Quality & Attribute Inference Layer

MLS data is only as good as the listing agent's input. Many agents skip structured fields (pool, view, spa, garage) even when the property has those features. The CMA engine accounts for this with a multi-signal confidence system.

### Core Principle: Unknown ≠ No

A `null` or missing field is **never** treated the same as an explicit `false`. The engine distinguishes three states:

| State | Example | Behavior |
|---|---|---|
| **Confirmed yes** | `poolYn: true` | Full match score |
| **Confirmed no** | `poolYn: false` | Full mismatch penalty |
| **Unknown** | `poolYn: null/undefined` | No penalty — infer from other signals |

### Signal Sources (Priority Order)

#### 1. Structured MLS Fields (100% confidence)
The canonical source. When present, always trusted.
```
poolYn: true → pool: confirmed
garageSpaces: 3 → garage: confirmed 3-car
view: "Golf Course, Mountain(s)" → view: confirmed golf + mountain
```

#### 2. Public Remarks Parsing (85-95% confidence)
Agents write detailed descriptions in `publicRemarks` even when they skip checkboxes. The engine parses keywords/patterns:

```typescript
// src/lib/cma/remarks-parser.ts
interface ParsedRemarks {
  pool: { detected: boolean; confidence: number; snippet: string };
  spa: { detected: boolean; confidence: number; snippet: string };
  view: { detected: boolean; categories: string[]; confidence: number; snippet: string };
  garage: { detected: boolean; spaces: number | null; confidence: number; snippet: string };
  gated: { detected: boolean; confidence: number };
  golf: { detected: boolean; confidence: number };
  remodeled: { detected: boolean; confidence: number };
  furnished: { detected: boolean; level: string | null; confidence: number };
}
```

**Keyword patterns (examples):**

| Feature | High-confidence patterns | Lower-confidence patterns |
|---|---|---|
| Pool | "private pool", "heated pool", "pool and spa", "sparkling pool" | "community pool" (shared, not private) |
| Spa | "spa", "hot tub", "jacuzzi" | "spa-like bathroom" (false positive — exclude) |
| View | "mountain views", "golf course views", "panoramic views", "ocean views" | "views" alone (ambiguous) |
| Garage | "3-car garage", "attached garage", "2 car garage" | "parking" alone (could be carport) |
| Golf | "golf membership", "on golf course", "golf course lot" | "near golf" (proximity, not on-course) |
| Gated | "gated community", "guard gated", "private gates" | "gated" alone |
| Remodeled | "remodeled", "renovated", "updated", "newly remodeled" | "original" (opposite signal) |

**False positive exclusions:**
- "spa-like" → not a spa
- "community pool" → shared amenity, not private pool (flag separately)
- "pool table" → not a swimming pool
- "views of the pool" → pool view, not mountain/golf view
- "no pool" → explicit negative

#### 3. Subdivision Profile Inference (60-80% confidence)
Built by aggregating all listings (active + closed) in the same subdivision:

```typescript
// src/lib/cma/subdivision-profile.ts
interface SubdivisionProfile {
  subdivisionName: string;
  totalListings: number;

  // Attribute prevalence (0-1 ratio of listings with this feature)
  poolPrevalence: number;      // e.g., 0.92 = 92% have pools
  spaPrevalence: number;
  garagePrevalence: number;
  avgGarageSpaces: number;
  viewPrevalence: number;
  commonViewTypes: string[];   // ["Golf Course", "Mountain(s)"]
  gatedPrevalence: number;
  seniorPrevalence: number;

  // Typical ranges
  sqftRange: { min: number; median: number; max: number };
  lotSizeRange: { min: number; median: number; max: number };
  priceRange: { min: number; median: number; max: number };
  yearBuiltRange: { min: number; median: number; max: number };
  commonArchStyles: string[];
  commonPropertySubTypes: string[];

  // Community-level data (from subdivisions collection)
  communityFeatures: string | null;   // "Dog Park, Golf Course Within Development"
  communityFacts: any | null;         // Rich data from our subdivision model

  lastUpdated: Date;
}
```

**Inference rules:**
- If `poolPrevalence >= 0.85` and listing has `poolYn: null` → infer pool likely (75% confidence)
- If `poolPrevalence <= 0.10` and listing has `poolYn: null` → infer no pool likely (70% confidence)
- If `communityFeatures` includes "Golf Course Within Development" → all listings get golf view boost
- If subdivision is known gated (from `communityFacts.securityType`) → infer gated for all listings

**Build strategy:** Pre-computed and cached. Run as a background job (cron or on-demand) that aggregates profiles for all subdivisions with 5+ listings. Store in a `subdivision_profiles` collection or in-memory cache with 24h TTL.

#### 4. Neighbor Comparison (50-70% confidence)
For listings NOT in a known subdivision, compare against nearby closed sales (radius 0.25 miles):
- If 4/5 nearby homes have pools → subject likely has pool
- If nearby homes average 2-car garages → subject likely has garage

Lower confidence than subdivision profile because proximity doesn't guarantee similarity.

### Confidence Aggregation

When multiple signals exist, combine them:

```typescript
function aggregateConfidence(signals: { detected: boolean; confidence: number }[]): {
  result: boolean | "unknown";
  confidence: number;
  source: string;
} {
  // Highest-confidence signal wins
  // If signals conflict, report the conflict
  // If all signals are low confidence, report "unknown"
}
```

**Example for a listing with `poolYn: null`:**

| Signal | Detected | Confidence | Source |
|---|---|---|---|
| MLS field | — | — | Not available |
| Remarks: "beautiful pool and spa" | Yes | 92% | publicRemarks |
| Subdivision: 94% have pools | Yes | 75% | subdivision profile |
| **Aggregate** | **Yes** | **92%** | **publicRemarks** |

### Confidence Display in CMA Output

The CMA report shows inferred attributes with visual indicators:

| Indicator | Meaning |
|---|---|
| ✓ | Confirmed from MLS data (100%) |
| ✓~ | Inferred from remarks (85-95%) |
| ~  | Inferred from subdivision profile (60-80%) |
| ?  | Unknown — insufficient data to determine |

Example in the comp table:
```
Pool/Spa/Garage: ✓Yes / ✓~Yes / ✓3    (pool confirmed, spa from remarks, garage confirmed)
```

The narrative section calls out inferences:
> "Note: Spa status for 2910 N Bahada Road was inferred from listing remarks ('heated spa and pool').
> Pool status for 2940 N Chuperosa was inferred from subdivision data (94% of Indian Wells CC homes have pools)."

### Handling Conflicts

When signals disagree:
- `poolYn: false` but remarks say "beautiful pool" → Trust MLS field (agent may have made error, but structured data is canonical). Flag for agent review.
- Subdivision says 90% have pools, but `poolYn: false` → Trust the explicit `false`. This home is in the 10% without.
- Remarks say "no pool" but `poolYn: null` → Mark as confirmed no pool.

---

## Property Attribute Matching

Beyond sqft and bed/bath, the CMA engine matches on all relevant property attributes. These are used both as **hard filters** (must match) and **soft scoring factors** (better match = higher score).

### Hard Filters (always applied)
| Attribute | Field(s) | Rule |
|---|---|---|
| Property type | `propertyType` | Must match (A=residential, B=rental, D=land) |
| Property sub-type | `propertySubType` | Must match category: SFR, Condo, Townhouse, Manufactured, etc. |
| Land type | `landType` | Must match: "Fee" vs "Lease" — lease-land homes are fundamentally different comps |

### Amenity Matching (required when subject has them)
| Attribute | Field(s) | Matching Rule |
|---|---|---|
| Pool | `poolYn`, `pool` | If subject has pool → comps must have pool. If no pool → prefer no pool, but allow pool comps at lower score |
| Spa | `spaYn`, `spa` | Same logic as pool |
| View | `viewYn`, `view` | If subject has view → prefer same view type. View categories: Golf Course, Mountain(s), Desert, Ocean/Water, City Lights, Panoramic, Pool |
| Gated community | `gatedCommunity` | If subject is gated → prefer gated comps |
| Senior community | `seniorCommunityYn` | Must match — senior communities are a different market |

### View Type Categories
The `view` field is a comma-separated string. We parse and categorize:

| Category | Matches in `view` field | Notes |
|---|---|---|
| Golf | "Golf Course" | ~3,300 active listings. Premium amenity in Coachella Valley |
| Mountain | "Mountain(s)" | ~31,000 active. Common in desert markets |
| Desert | "Desert" | ~8,600 active |
| Water | "Ocean", "Beach", "Water", "Lake" | ~9,900 active. Highest premium |
| City | "City Lights", "Panoramic" | Urban premium |
| Pool view | "Pool" | Views of community/own pool |

**Scoring:** Exact view match = full points. Same category = partial points. No view match = 0.

### Lot Size Categories
Lot size varies dramatically. Rather than a flat +/- range, we use **percentage-based matching** with category awareness:

| Category | Lot Size | Tolerance | Notes |
|---|---|---|---|
| Standard lot | < 10,000 sqft | +/- 2,000 sqft | Typical tract home |
| Large lot | 10,000 - 43,560 sqft (1 acre) | +/- 25% | Custom home lots |
| Acreage | 1 - 5 acres | +/- 30% | Ranch/equestrian potential (~18,600 listings with 1+ acre) |
| Estate / Ranch | 5+ acres | +/- 40% | True ranch/equestrian. ~3,100 listings with ranch/equestrian lot features |

**Lot features parsing:** The `lotFeatures` field contains keywords like "Agricultural", "Horse Trails", "Stable(s)", "On Golf Course", "Premium Lot", "Cul-De-Sac". These are used as soft scoring factors.

### Architectural Style Matching
The `architecturalStyle` field (comma-separated) includes: Ranch, Spanish, Contemporary, Modern, Mid Century, Tuscan, Mediterranean, Craftsman, A-Frame, Adobe, etc.

**Rule:** Same architectural style = bonus score. Not a hard filter, but valuable for luxury tier where style matters to buyers.

### Stories / Levels
| Subject | Comp requirement |
|---|---|
| 1 story | Prefer 1 story (important for accessibility buyers) |
| 2+ story | Allow 1 or 2+ story |

### Furnished Status
The `furnished` field: Furnished, Turnkey, Partially Furnished, Unfurnished.

**Rule:** Only matters for rental/vacation comps. For standard residential, ignore.

### Garage / Parking
| Field | Matching |
|---|---|
| `garageSpaces` | Match within +/- 1 space |
| `parkingTotal` | Soft score factor |
| `carportSpaces` | Carport vs garage is a quality difference — note in limitations |

### HOA / Association
| Field | Matching |
|---|---|
| `associationYn` | If subject has HOA, prefer HOA comps (and vice versa) |
| `associationFee` | Within +/- 50% for scoring. Very high HOA ($1000+/mo) is a separate market segment |
| `landLeaseAmount` | Lease-land properties must match lease-land comps. Fee-land ≠ lease-land |

### School District
`schoolDistrict` — Same school district is a soft scoring bonus. Not a hard filter, but affects value.

---

## Comp Scoring Algorithm

Each potential comp gets a similarity score (0-100). Weights shift slightly by tier.

### Base Weights (Residential Tier)

| Factor | Weight | Scoring |
|---|---|---|
| Sqft similarity | 20 | 20 * (1 - abs(compSqft - subjectSqft) / subjectSqft) |
| Same subdivision | 15 | 15 if same, 0 if different |
| Bed/bath match | 12 | 12 if exact, 8 if +/-1, 4 if +/-2 |
| Pool/spa match | 10 | 10 if both match, 5 if partial, 0 if mismatch |
| Lot size similarity | 10 | 10 * (1 - abs(diff) / subjectLot), clamped to 0 |
| View match | 8 | 8 if exact category, 4 if partial, 0 if mismatch |
| Recency (closed) | 10 | 10 * (1 - monthsAgo / maxMonths) |
| Year built proximity | 5 | 5 * (1 - abs(compYear - subjectYear) / 30) |
| Architectural style | 3 | 3 if any style keyword matches |
| Stories match | 3 | 3 if same, 0 if different |
| Garage match | 2 | 2 if within +/-1 space |
| Land type match | 2 | 2 if same (fee/lease). Hard filter usually catches this |

### Weight Adjustments by Tier

**Affordable:** Sqft +5, View -5, Arch style -3, Lot -5, Bed/bath +5, Recency +3
**Luxury:** View +5, Lot +5, Arch style +3, Sqft -3, Subdivision +5, Recency -5

### Score Normalization
Total weights always sum to 100. Factors that don't apply (e.g., no view on subject) redistribute their weight proportionally to remaining factors.

Top 5 by score are selected for each status (active / closed).

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  CONSUMERS                       │
│                                                  │
│  Listing Page    Chat Tool     Standalone Page   │
│  (auto-gen)      (on demand)   (/cma/[id])       │
└──────┬──────────────┬───────────────┬────────────┘
       │              │               │
       ▼              ▼               ▼
┌─────────────────────────────────────────────────┐
│            CMA ENGINE (utility)                  │
│                                                  │
│  src/lib/cma/engine.ts                           │
│                                                  │
│  generateCMA(subjectListing, options?)           │
│    → { subject, activeComps, closedComps,        │
│        stats, tier, limitations, narrative }      │
│                                                  │
│  Inputs:                                         │
│    - Subject listing (IUnifiedListing)            │
│    - Options: { maxComps, dateRange, tier }       │
│                                                  │
│  Steps:                                          │
│    1. Classify tier (affordable/residential/lux)  │
│    2. Run hierarchy search for active comps       │
│    3. Run hierarchy search for closed comps       │
│    4. Score and rank comps                        │
│    5. Calculate aggregate stats                   │
│    6. Generate narrative summary                  │
│    7. Return structured CMA result                │
└──────┬──────────────┬───────────────┬────────────┘
       │              │               │
       ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ unified_     │ │ unified_     │ │ closed-sales │
│ listings     │ │ closed_      │ │ aggregator   │
│ (active)     │ │ listings     │ │ (existing)   │
│              │ │ (sold)       │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## CMA Result Shape

```typescript
interface CMAResult {
  // Subject property
  subject: {
    listingKey: string;
    address: string;
    city: string;
    subdivisionName: string;
    listPrice: number;
    livingArea: number;
    lotSize: number;
    lotSizeAcres: number;
    bedsTotal: number;
    bathsTotal: number;
    yearBuilt: number;
    pool: boolean;
    spa: boolean;
    garageSpaces: number;
    pricePerSqft: number;
    propertySubType: string;   // "Single Family Residence", "Condominium", etc.
    landType: string;          // "Fee" or "Lease"
    view: string | null;       // "Golf Course, Mountain(s)" or null
    viewCategory: string[];    // ["Golf", "Mountain"]
    architecturalStyle: string | null;
    stories: number;
    gatedCommunity: boolean;
    seniorCommunity: boolean;
    associationFee: number;
    furnished: string | null;
    lotFeatures: string | null;
    schoolDistrict: string | null;
  };

  // Tier classification
  tier: "affordable" | "residential" | "luxury";

  // Comparable properties
  activeComps: CMAComp[];   // Up to 5
  closedComps: CMAComp[];   // Up to 5

  // Aggregate statistics
  stats: {
    active: CMAStats;
    closed: CMAStats;
    combined: CMAStats;
  };

  // Limitations encountered during search
  limitations: string[];
  // e.g., "Unable to find homes with pool in same subdivision, expanded to city"

  // AI-generated narrative (short, 2-3 sentences)
  narrative: string;

  // Metadata
  generatedAt: string;
  searchCriteria: {
    level: number;        // Which hierarchy level was used
    subdivision: boolean; // Were comps from same subdivision?
    dateRange: string;    // e.g., "6 months"
    sqftRange: string;    // e.g., "+/- 400 sqft"
  };
}

interface CMAComp {
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  subdivisionName: string;
  yearBuilt: number;
  pool: boolean;
  spa: boolean;
  garageSpaces: number;
  date: string;              // onMarketDate (active) or closeDate (closed)
  bedsTotal: number;
  bathsTotal: number;
  livingArea: number;
  lotSize: number;
  lotSizeAcres: number;
  listPricePerSqft: number;
  originalListPrice: number;
  currentListPrice: number;
  closePrice?: number;       // Closed only
  salePricePerSqft?: number; // Closed only
  salePriceToListRatio?: number; // closePrice / listPrice
  daysOnMarket: number;
  similarityScore: number;   // 0-100

  // Extended attributes
  propertySubType: string;
  landType: string;
  view: string | null;
  architecturalStyle: string | null;
  stories: number;
  gatedCommunity: boolean;
  seniorCommunity: boolean;
  associationFee: number;
  lotFeatures: string | null;
  schoolDistrict: string | null;

  // Score breakdown (for transparency in reports)
  scoreBreakdown: {
    sqft: number;
    subdivision: number;
    bedBath: number;
    poolSpa: number;
    lotSize: number;
    view: number;
    recency: number;
    yearBuilt: number;
    archStyle: number;
    stories: number;
    garage: number;
    landType: number;
  };
}

interface CMAStats {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  avgPricePerSqft: number;
  avgSqft: number;
  minSqft: number;
  maxSqft: number;
  medianSqft: number;
  avgLotSize: number;
  avgDaysOnMarket: number;
  avgBedsTotal: number;
  avgBathsTotal: number;
  avgSalePriceToListRatio?: number; // Closed only
}
```

---

## Component Architecture

### Display Components (shadcn + Recharts)

All components accept the `CMAResult` object and respect the app's theme context (light/dark).

```
src/app/components/cma/
├── CMAReport.tsx              # Full report wrapper — orchestrates all sections
├── CMASubjectCard.tsx         # Subject property summary card
├── CMACompTable.tsx           # Table of comps (active or closed) — shadcn Table
├── CMAStatsRow.tsx            # Aggregate stats bar (avg, min, max, median)
├── CMANarrative.tsx           # AI narrative + limitations callout
├── charts/
│   ├── PricePerSqftBar.tsx    # Bar: list $/sqft vs sale $/sqft per comp
│   ├── PriceTrendLine.tsx     # Line: close prices over time
│   ├── DaysOnMarketBar.tsx    # Bar: DOM per comp
│   ├── SalePriceRatioPie.tsx  # Pie: % above/at/below list price
│   └── SqftComparisonBar.tsx  # Bar: sqft comparison (subject vs comps)
```

### CMACompTable Columns

| Column | Active | Closed | Notes |
|---|---|---|---|
| Listing # | x | x | listingId |
| Address | x | x | Truncated, links to listing page |
| City | x | x | |
| Year | x | x | yearBuilt |
| P/S/G | x | x | Pool/Spa/Garage — "Yes/Yes/3" format |
| Date | x | x | onMarketDate or closeDate |
| BD | x | x | bedsTotal |
| BTH | x | x | bathsTotal |
| SqFt | x | x | livingArea |
| LotSz | x | x | lotSize |
| LP/SqFt | x | x | listPrice / livingArea |
| Orig LP | x | x | originalListPrice |
| LP | x | x | currentListPrice |
| SP | | x | closePrice |
| SP/SqFt | | x | salePricePerSqft |
| SP/LP | | x | salePriceToListRatio |
| DIM | x | x | daysOnMarket |

Footer row: Average, Min, Max, Median for numeric columns.

---

## Chat Tool Integration (Future)

The CMA engine will be exposed as a chat tool:

```typescript
// Tool definition for the AI chat
{
  name: "generate_cma",
  description: "Generate a Comparative Market Analysis for a property",
  parameters: {
    listingKey: "string — the listing to analyze",
    // Optional overrides:
    maxComps: "number — max comps per status (default 5)",
    dateRange: "string — 6mo, 12mo, 24mo (default auto by tier)",
  }
}
```

**Chat response format:**
1. Short narrative (2-3 sentences): market position, price alignment, key insights
2. Limitations noted (if any comps couldn't be matched on pool/spa/etc.)
3. Link to full CMA report page
4. Option: "Would you like me to add more comparables?" → re-runs with expanded parameters

---

## File Structure

```
src/
├── lib/
│   └── cma/
│       ├── types.ts                # All TypeScript interfaces
│       ├── tiers.ts                # Tier classification + parameter tables
│       ├── scoring.ts              # Comp similarity scoring algorithm
│       ├── remarks-parser.ts       # Public remarks keyword/NLP extraction
│       ├── subdivision-profile.ts  # Subdivision attribute aggregation + caching
│       ├── attribute-resolver.ts   # Multi-signal confidence aggregation
│       ├── engine.ts               # Core CMA generation orchestrator
│       └── narrative.ts            # AI narrative + limitations generator
├── app/
│   ├── api/
│   │   └── cma/
│   │       ├── generate/route.ts       # POST — generate CMA for a listing
│   │       └── subdivision-profile/route.ts  # GET — fetch/rebuild subdivision profile
│   └── components/
│       └── cma/
│           ├── CMAReport.tsx           # Full report wrapper
│           ├── CMASubjectCard.tsx      # Subject property summary
│           ├── CMACompTable.tsx        # Active/Closed comp tables (shadcn Table)
│           ├── CMAStatsRow.tsx         # Aggregate stats bar
│           ├── CMANarrative.tsx        # Narrative + limitations + confidence notes
│           ├── CMAConfidenceBadge.tsx  # ✓ / ✓~ / ~ / ? indicator component
│           └── charts/
│               ├── PricePerSqftBar.tsx     # Bar: list $/sqft vs sale $/sqft
│               ├── PriceTrendLine.tsx       # Line: close prices over time
│               ├── DaysOnMarketBar.tsx      # Bar: DOM per comp
│               ├── SalePriceRatioPie.tsx    # Pie: % above/at/below list
│               └── SqftComparisonBar.tsx    # Bar: sqft subject vs comps
```

---

## Implementation Order

### Phase 1 — Data Quality Layer
1. **`src/lib/cma/types.ts`** — All TypeScript interfaces (CMAResult, CMAComp, SubdivisionProfile, ParsedRemarks, ConfidenceSignal, etc.)
2. **`src/lib/cma/remarks-parser.ts`** — Keyword extraction from publicRemarks (pool, spa, view, garage, golf, gated, remodeled, furnished). Includes false-positive exclusions.
3. **`src/lib/cma/subdivision-profile.ts`** — Aggregates attribute prevalence across all listings in a subdivision. Caches results with 24h TTL. Queries both `unified_listings` and `unified_closed_listings`.
4. **`src/lib/cma/attribute-resolver.ts`** — Takes a listing + subdivision profile + parsed remarks → outputs resolved attributes with confidence scores. Handles conflicts, aggregation, and the "unknown ≠ no" principle.

### Phase 2 — Comp Engine
5. **`src/lib/cma/tiers.ts`** — Tier classification (affordable/residential/luxury) and parameter tables (sqft range, lot tolerance, date ranges, weight adjustments)
6. **`src/lib/cma/scoring.ts`** — Comp similarity scoring with 12 factors, tier-adjusted weights, confidence-aware matching (don't penalize when data is unknown)
7. **`src/lib/cma/engine.ts`** — Core orchestrator: classify tier → resolve attributes → run 5-level hierarchy search → score & rank → calculate stats → return CMAResult
8. **`src/lib/cma/narrative.ts`** — Generates short narrative summary + lists limitations/inferences

### Phase 3 — API
9. **`src/app/api/cma/generate/route.ts`** — POST endpoint: accepts listingKey or listing data, returns CMAResult
10. **`src/app/api/cma/subdivision-profile/route.ts`** — GET endpoint: fetch or rebuild a subdivision profile on demand

### Phase 4 — UI Components
11. **`src/app/components/cma/CMAConfidenceBadge.tsx`** — Reusable ✓/✓~/~/? indicator
12. **`src/app/components/cma/CMACompTable.tsx`** — shadcn Table with all columns, confidence indicators, footer stats rows
13. **`src/app/components/cma/CMASubjectCard.tsx`** — Subject property summary card
14. **`src/app/components/cma/CMAStatsRow.tsx`** — Aggregate stats (avg, min, max, median)
15. **`src/app/components/cma/charts/*.tsx`** — All chart components (Recharts)
16. **`src/app/components/cma/CMANarrative.tsx`** — Narrative + limitations + inference notes
17. **`src/app/components/cma/CMAReport.tsx`** — Full report orchestrator

### Phase 5 — Integration
18. **Listing page integration** — Add "Generate CMA" button on MLS listing detail page
19. **Chat tool integration** — Register `generate_cma` tool for AI chat, format response with narrative + link to full report
