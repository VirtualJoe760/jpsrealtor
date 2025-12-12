# Real Estate Analytics Architecture

**Purpose**: Comprehensive system for calculating, storing, and retrieving real estate financial metrics and market statistics that can power AI responses, CMAs, and dynamic map visualizations.

**Last Updated**: December 8, 2025
**Status**: Architecture Design

---

## Table of Contents
1. [Overview](#overview)
2. [Data Sources](#data-sources)
3. [Core Financial Calculations](#core-financial-calculations)
4. [Analytics Modules](#analytics-modules)
5. [API Structure](#api-structure)
6. [AI Integration](#ai-integration)
7. [Implementation Phases](#implementation-phases)

---

## Overview

### The Problem
- Need to answer complex real estate questions (e.g., "Which neighborhood has better appreciation and cashflow?")
- Multiple data sources (active listings, closed sales, rental comps)
- Complex financial calculations (ROI, cap rate, cash-on-cash return, appreciation)
- Need to work for AI responses AND map visualizations
- Must calculate on-the-fly for custom queries

### The Solution
A layered analytics system:

```
┌─────────────────────────────────────────────────────────┐
│                    AI Query Layer                        │
│  "Compare Indian Wells CC vs Palm Desert CC"            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Analytics API Layer                         │
│  /api/analytics/compare                                  │
│  /api/analytics/appreciation                             │
│  /api/analytics/cashflow                                 │
│  /api/analytics/cma                                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│         Calculation Engine Layer                         │
│  Financial formulas, aggregations, comparisons          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              Data Layer                                  │
│  UnifiedListing, GPSClosedListing, CRMLSClosedListing   │
│  Cities, Counties, Subdivisions                          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Active Listings
**Collections**: `UnifiedListing`, `Listing` (GPS), `CRMLSListing`
**Use For**: Current market prices, inventory levels, days on market

**Key Fields**:
- `listPrice` - Current asking price
- `propertyType` - A (sale), B (rental), C (multi-family), D (land)
- `bedsTotal`, `bathroomsTotalInteger`, `livingArea`
- `subdivisionName`, `city`, `postalCode`
- `listingDate`, `modificationTimestamp`

### Closed Sales
**Collections**: `GPSClosedListing`, `CRMLSClosedListing`
**Use For**: Appreciation trends, actual sale prices, market velocity

**Key Fields**:
- `closePrice` - Actual sale price
- `closeDate` - When it sold
- `originalListPrice` - Initial asking
- `daysOnMarket` - Time to sell
- Historical data for trend analysis

### Geographic Boundaries
**Collections**: `Region`, `County`, `City`, `Subdivision`
**Use For**: Geographic aggregation, boundary-based comparisons

**Key Fields**:
- Pre-calculated stats (may not respect filters)
- Boundary polygons for spatial queries
- Demographic data

---

## Core Financial Calculations

### 1. Appreciation Analysis

**Formula**: `((Current Price - Historical Price) / Historical Price) * 100`

**Variants**:
- Year-over-Year (YoY)
- 3-Year Average
- 5-Year Average
- Month-over-Month (MoM)

**Data Required**:
- Closed sales with `closePrice` and `closeDate`
- Grouped by location (subdivision, city, zip)
- Minimum sample size for statistical validity

**Example**:
```typescript
{
  location: "Indian Wells Country Club",
  appreciation: {
    yoy: 8.5,              // 8.5% last year
    threeYear: 6.2,        // 6.2% annually over 3 years
    fiveYear: 5.8,         // 5.8% annually over 5 years
    trend: "increasing",
    sampleSize: 47         // 47 closed sales analyzed
  }
}
```

### 2. Cash Flow Analysis

**Formula**: `Monthly Rental Income - Monthly Expenses`

**Components**:
- **Rental Income**: Market rent (from rental comps)
- **Expenses**:
  - Mortgage payment (PITI)
  - Property taxes
  - Insurance
  - HOA fees
  - Maintenance (1-2% of property value annually)
  - Vacancy factor (5-10%)
  - Property management (8-10% of rent)

**Example**:
```typescript
{
  location: "Palm Desert Country Club",
  cashFlow: {
    monthlyRent: 4500,
    monthlyExpenses: 3800,
    netCashFlow: 700,
    annualCashFlow: 8400,
    assumptions: {
      downPayment: 100000,
      loanAmount: 400000,
      interestRate: 6.875,
      propertyTaxRate: 1.25,
      insurance: 150,
      hoa: 350,
      maintenance: 200,
      vacancy: 225,        // 5% of rent
      management: 360      // 8% of rent
    }
  }
}
```

### 3. Return on Investment (ROI)

**Cash-on-Cash Return**: `(Annual Cash Flow / Total Cash Invested) * 100`

**Cap Rate**: `(Net Operating Income / Property Value) * 100`

**Total ROI**: Combines cash flow + appreciation + principal paydown

**Example**:
```typescript
{
  metrics: {
    cashOnCashReturn: 8.4,    // 8.4% return on cash invested
    capRate: 5.2,             // 5.2% cap rate
    totalROI: 14.6,           // 14.6% total return
    breakdownROI: {
      cashFlow: 8.4,
      appreciation: 5.8,
      principalPaydown: 0.4
    }
  }
}
```

### 4. Comparative Market Analysis (CMA)

**Components**:
- Active listings (current competition)
- Pending sales (under contract)
- Closed sales (last 90-180 days)
- Price adjustments and trends

**Adjustments**:
- Square footage ($X per sqft)
- Bedrooms/bathrooms
- Lot size
- Pool/spa features
- Age/condition
- Location premium

**Example**:
```typescript
{
  subject: {
    address: "123 Main St",
    estimatedValue: 675000,
    confidence: "high",
    priceRange: [650000, 700000]
  },
  comparables: [
    {
      address: "456 Oak Ave",
      soldPrice: 680000,
      soldDate: "2025-11-15",
      adjustments: {
        sqft: -5000,      // Smaller
        bed: 0,
        bath: 5000,       // Extra bath
        pool: 15000,      // Has pool
        total: 15000
      },
      adjustedPrice: 695000
    }
  ],
  marketConditions: {
    daysOnMarket: 28,
    priceReductions: 12,
    absorption: "balanced"
  }
}
```

### 5. Rental Yield Analysis

**Gross Rental Yield**: `(Annual Rent / Property Value) * 100`

**Net Rental Yield**: `(Annual NOI / Property Value) * 100`

**Example**:
```typescript
{
  property: {
    value: 500000,
    monthlyRent: 3500,
    annualRent: 42000
  },
  yields: {
    grossYield: 8.4,      // 8.4% gross
    netYield: 5.2,        // 5.2% net (after expenses)
    comparison: {
      neighborhood: 7.8,
      city: 7.2,
      county: 6.5
    }
  }
}
```

---

## Analytics Modules

### Module Structure

```
src/
├── lib/
│   ├── analytics/
│   │   ├── index.ts                      # Main exports
│   │   ├── calculations/
│   │   │   ├── appreciation.ts           # Appreciation formulas
│   │   │   ├── cashflow.ts              # Cash flow calculations
│   │   │   ├── roi.ts                   # ROI metrics
│   │   │   ├── cma.ts                   # CMA logic
│   │   │   ├── rental-yield.ts          # Rental analysis
│   │   │   └── index.ts                 # Calculation exports
│   │   ├── aggregators/
│   │   │   ├── location-stats.ts        # Aggregate by location
│   │   │   ├── time-series.ts           # Trend analysis
│   │   │   ├── comparable-finder.ts     # Find comps
│   │   │   └── index.ts
│   │   ├── comparators/
│   │   │   ├── neighborhood.ts          # Compare neighborhoods
│   │   │   ├── property.ts              # Compare properties
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── financial.ts             # Mortgage, tax utils
│   │       ├── statistical.ts           # Mean, median, std dev
│   │       └── validators.ts            # Data validation
│   └── ...
└── app/
    └── api/
        └── analytics/
            ├── README.md                 # Analytics API docs
            ├── route.ts                  # Index
            ├── appreciation/
            │   └── route.ts
            ├── cashflow/
            │   └── route.ts
            ├── compare/
            │   └── route.ts
            ├── cma/
            │   └── route.ts
            └── rental-yield/
                └── route.ts
```

---

## API Structure

### Base: `/api/analytics`

**Index Endpoint**:
```
GET /api/analytics
Returns list of all analytics endpoints with descriptions
```

### Appreciation Analysis

```
GET /api/analytics/appreciation?location={subdivision|city|zip}&period={1y|3y|5y}

Response:
{
  location: "Indian Wells Country Club",
  period: "5y",
  appreciation: {
    annual: 5.8,
    cumulative: 32.4,
    trend: "increasing",
    byYear: [
      { year: 2020, rate: 4.2 },
      { year: 2021, rate: 12.5 },
      { year: 2022, rate: 3.8 },
      { year: 2023, rate: -2.1 },
      { year: 2024, rate: 6.5 }
    ]
  },
  marketData: {
    medianPrice2020: 485000,
    medianPrice2025: 642000,
    salesCount: 47,
    confidence: "high"
  }
}
```

### Cash Flow Analysis

```
POST /api/analytics/cashflow
Body: {
  purchasePrice: 500000,
  downPayment: 100000,
  interestRate: 6.875,
  location: "Palm Desert Country Club",
  propertyType: "singleFamily",
  assumptions: {
    propertyTax: 1.25,
    insurance: 150,
    hoa: 350,
    maintenance: 1.5,
    vacancy: 5,
    management: 8
  }
}

Response:
{
  cashFlow: {
    monthly: 700,
    annual: 8400
  },
  breakdown: {
    income: {
      rent: 4500
    },
    expenses: {
      mortgage: 2600,
      propertyTax: 520,
      insurance: 150,
      hoa: 350,
      maintenance: 200,
      vacancy: 225,
      management: 360,
      total: 3805
    }
  },
  metrics: {
    cashOnCashReturn: 8.4,
    capRate: 5.2
  },
  rentalComps: [
    { address: "...", rent: 4200 },
    { address: "...", rent: 4800 }
  ]
}
```

### Neighborhood Comparison

```
POST /api/analytics/compare
Body: {
  locations: [
    "Indian Wells Country Club",
    "Palm Desert Country Club"
  ],
  metrics: ["appreciation", "cashflow", "rental-yield"]
}

Response:
{
  comparison: [
    {
      location: "Indian Wells Country Club",
      metrics: {
        appreciation: { annual: 6.2, rank: 1 },
        cashflow: { monthly: 850, rank: 2 },
        rentalYield: { gross: 8.2, rank: 2 }
      },
      score: 82
    },
    {
      location: "Palm Desert Country Club",
      metrics: {
        appreciation: { annual: 5.8, rank: 2 },
        cashflow: { monthly: 900, rank: 1 },
        rentalYield: { gross: 8.5, rank: 1 }
      },
      score: 84
    }
  ],
  winner: "Palm Desert Country Club",
  summary: "Palm Desert CC offers better cash flow and rental yield, while Indian Wells CC shows slightly higher appreciation."
}
```

### CMA Generation

```
POST /api/analytics/cma
Body: {
  subject: {
    address: "123 Main St, Palm Desert, CA",
    beds: 3,
    baths: 2,
    sqft: 2200,
    lotSize: 8000,
    features: ["pool", "spa"]
  },
  radius: 0.5,  // miles
  maxAge: 90    // days
}

Response:
{
  estimatedValue: 675000,
  confidence: "high",
  priceRange: [650000, 700000],
  comparables: [...],
  marketConditions: {...}
}
```

---

## AI Integration

### AI Tool Definitions

```typescript
{
  name: "analyze_appreciation",
  description: "Calculate and compare appreciation rates for neighborhoods or properties",
  parameters: {
    locations: ["Indian Wells Country Club", "Palm Desert Country Club"],
    period: "5y"
  }
}

{
  name: "compare_investment_potential",
  description: "Compare cash flow, appreciation, and ROI between locations",
  parameters: {
    locations: [...],
    metrics: ["appreciation", "cashflow", "roi"]
  }
}

{
  name: "generate_cma",
  description: "Generate comparative market analysis for a property",
  parameters: {
    subject: {...},
    radius: 0.5
  }
}
```

### AI Response Flow

```
User: "Which is better: Indian Wells CC or Palm Desert CC?"

AI thinks:
1. Use analyze_appreciation tool
2. Use compare_investment_potential tool
3. Synthesize results

AI responds:
"Based on the analysis:

**Indian Wells Country Club**
- 5-year appreciation: 6.2% annually
- Monthly cash flow: ~$850
- Rental yield: 8.2%

**Palm Desert Country Club**
- 5-year appreciation: 5.8% annually
- Monthly cash flow: ~$900
- Rental yield: 8.5%

**Verdict**: Palm Desert CC offers better cash flow (+$50/mo) and rental yields, making it stronger for immediate income. Indian Wells CC shows slightly higher appreciation (+0.4%), better for long-term equity growth.

Your choice depends on goals: immediate cash flow (Palm Desert) vs appreciation (Indian Wells)."
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Stats API refactor (DONE)
- [ ] Create analytics module structure
- [ ] Build core calculation utilities
- [ ] Implement appreciation analysis
- [ ] Create `/api/analytics/appreciation` endpoint

### Phase 2: Cash Flow & ROI (Week 2)
- [ ] Rental comp finder
- [ ] Cash flow calculator
- [ ] ROI metrics
- [ ] Create `/api/analytics/cashflow` endpoint
- [ ] Create `/api/analytics/roi` endpoint

### Phase 3: Comparison & CMA (Week 3)
- [ ] Neighborhood comparator
- [ ] CMA generator
- [ ] Comparable finder
- [ ] Create `/api/analytics/compare` endpoint
- [ ] Create `/api/analytics/cma` endpoint

### Phase 4: AI Integration (Week 4)
- [ ] Define AI tool schemas
- [ ] Create AI-optimized endpoints
- [ ] Test with real queries
- [ ] Documentation for AI prompts

### Phase 5: Map Integration (Week 5)
- [ ] Update map-clusters to use analytics
- [ ] Dynamic boundary stats with filters
- [ ] Real-time calculations on zoom/pan
- [ ] Performance optimization

---

## Technical Considerations

### Performance
- **Caching**: Aggressive caching for common queries
- **Indexing**: MongoDB indexes on location, date, price fields
- **Aggregation**: Use MongoDB aggregation pipeline
- **Streaming**: Stream large datasets for CMA

### Data Quality
- **Validation**: Ensure minimum sample sizes
- **Outlier Detection**: Remove anomalies
- **Confidence Scores**: Indicate data reliability
- **Freshness**: Track data age

### Scalability
- **Batch Processing**: Pre-calculate common metrics
- **Queue System**: Handle complex calculations async
- **CDN**: Cache static calculations at edge
- **Microservices**: Separate heavy calculations

---

## Next Steps

1. **Review & Approve Architecture**
2. **Start Phase 1 Implementation**
3. **Create Calculation Library**
4. **Build First Analytics Endpoint**
5. **Test with Real Data**

---

**Questions to Answer**:
1. Which Phase should we prioritize first?
2. Should we build all calculations before APIs, or iterate?
3. Do we need a separate database for analytics cache?
4. How do we handle historical data gaps?
5. What's the minimum sample size for reliable stats?

