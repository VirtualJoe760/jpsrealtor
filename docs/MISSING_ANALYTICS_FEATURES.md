# Missing Analytics & Statistics Features

**Generated**: December 13, 2025
**Based On**: Current analytics architecture and implementation status

---

## Executive Summary

We currently have **appreciation analytics** working in production (1 out of 15+ planned features = ~7% complete). Below is a comprehensive list of analytics and statistics we should offer but don't currently have.

---

## 🔴 Critical Missing Features (High Priority)

### 1. **Cash Flow Analysis** ⏳ TODO
**Status**: Designed but not implemented
**Why Critical**: Essential for investment property decisions

**What's Missing**:
- Monthly cash flow calculator
- Expense breakdown (PITI + HOA + maintenance + vacancy + management)
- Rental income estimation from comps
- Cash-on-cash return calculation
- Break-even analysis

**User Questions We Can't Answer**:
- "What would my monthly cash flow be on this property?"
- "How much would I make per month renting this out?"
- "What are the total monthly expenses?"

**Data We Have**:
- ✅ List prices from UnifiedListing
- ✅ Closed sales data for comps
- ✅ HOA fees (associationFee field)
- ❌ Rental comps (need to scrape rental listings or use estimates)
- ❌ Property tax rates by location
- ❌ Insurance estimates
- ❌ Maintenance cost estimates

---

### 2. **ROI & Cap Rate Calculations** ⏳ TODO
**Status**: Designed but not implemented
**Why Critical**: Investors need this to compare opportunities

**What's Missing**:
- Cap rate (Net Operating Income / Property Value)
- Cash-on-cash return (Annual Cash Flow / Total Cash Invested)
- Total ROI (Cash flow + Appreciation + Principal paydown)
- Break-even analysis
- Payback period calculation

**User Questions We Can't Answer**:
- "What's the cap rate in this subdivision?"
- "Which neighborhood has better ROI?"
- "How long until I break even?"

---

### 3. **Rental Yield Analysis** ⏳ TODO
**Status**: Designed but not implemented

**What's Missing**:
- Gross rental yield (Annual Rent / Property Value)
- Net rental yield (Annual NOI / Property Value)
- Comparison to neighborhood/city/county averages
- Best rental yield neighborhoods

**User Questions We Can't Answer**:
- "What's the average rental yield in Palm Desert?"
- "Which subdivisions have the best rental yields?"
- "Is 6% rental yield good for this area?"

---

### 4. **Comparative Market Analysis (CMA)** ⏳ TODO
**Status**: Designed but not implemented
**Why Critical**: Buyers/sellers need property valuations

**What's Missing**:
- Find comparable properties (similar beds/baths/sqft/location)
- Adjustment factors (sqft, beds, baths, pool, lot size, age, condition)
- Estimated property value range
- Market conditions analysis
- Price trend visualization

**User Questions We Can't Answer**:
- "What's my home worth?"
- "What should I list my property for?"
- "Are comparable homes selling above or below asking?"
- "How does this property compare to similar ones?"

---

### 5. **Days on Market (DOM) Statistics** ⏳ PARTIAL
**Status**: Data exists but no aggregated analytics

**What's Missing**:
- Average DOM by city/subdivision/property type
- DOM trends (increasing/decreasing)
- Fast-selling vs slow-selling neighborhoods
- DOM by price range

**User Questions We Can't Answer**:
- "How fast do homes sell in this neighborhood?"
- "What's the average days on market for $500k homes?"
- "Are homes selling faster now than 6 months ago?"

**Data We Have**:
- ✅ `daysOnMarketCumulative` field in listings
- ❌ No aggregated statistics
- ❌ No trend analysis

---

### 6. **Price Per Square Foot Analytics** ⏳ PARTIAL
**Status**: Data exists but limited analytics

**What's Missing**:
- Average $/sqft by city/subdivision
- $/sqft trends over time
- $/sqft comparison between neighborhoods
- $/sqft by property type

**User Questions We Can't Answer**:
- "What's the average price per square foot in La Quinta?"
- "Is $300/sqft a good deal for this area?"
- "Which neighborhoods have the lowest $/sqft?"

**Data We Have**:
- ✅ `listPrice` and `livingArea` in all listings
- ❌ No aggregated $/sqft statistics

---

## 🟡 Important Missing Features (Medium Priority)

### 7. **Inventory Analysis** ⏳ TODO
**What's Missing**:
- Total active listings by location
- Months of inventory (supply/demand balance)
- New listings vs closings trend
- Inventory by price range
- Inventory by property type

**User Questions We Can't Answer**:
- "Is it a buyer's market or seller's market?"
- "How many homes are available under $500k?"
- "Is inventory increasing or decreasing?"

---

### 8. **Price Reduction Analysis** ⏳ TODO
**What's Missing**:
- % of listings with price reductions
- Average price reduction amount
- Time to price reduction
- Price reduction by location/price range

**User Questions We Can't Answer**:
- "How often do sellers drop their price?"
- "What's the average price reduction in this area?"
- "Are price cuts becoming more common?"

**Data We Have**:
- ✅ `modificationTimestamp` can detect price changes
- ✅ Price history in some MLS data
- ❌ Not aggregated or analyzed

---

### 9. **List Price vs Sale Price Analysis** ⏳ TODO
**What's Missing**:
- Average % of list price received
- Over/under asking trends
- Bidding war indicators
- List-to-sale ratio by location

**User Questions We Can't Answer**:
- "Do homes sell above or below asking in this area?"
- "What should I offer relative to asking price?"
- "Are there bidding wars in this neighborhood?"

**Data We Have**:
- ✅ `listPrice` in UnifiedListing
- ✅ `closePrice` and `originalListPrice` in closed sales
- ❌ Not compared or analyzed

---

### 10. **Property Tax Analysis** ⏳ TODO
**What's Missing**:
- Average property tax by city/county
- Effective tax rate calculation
- Tax burden comparison
- Tax trends over time
- Mello-Roos/special assessments tracking

**User Questions We Can't Answer**:
- "What will my property taxes be?"
- "Which cities have the lowest property taxes?"
- "Are property taxes going up in this area?"

**Data We Have**:
- ✅ `taxAnnualAmount` field in some listings
- ✅ `taxYear` field
- ❌ Incomplete data (not all listings have it)
- ❌ Not aggregated by location

---

### 11. **HOA Fee Analysis** ⏳ TODO
**What's Missing**:
- Average HOA fees by subdivision
- HOA fee trends
- High HOA vs Low HOA neighborhoods
- HOA fee ranges

**User Questions We Can't Answer**:
- "What's the average HOA in this subdivision?"
- "Which neighborhoods have low HOA fees?"
- "Are HOA fees increasing?"

**Data We Have**:
- ✅ `associationFee` field in listings
- ❌ Not aggregated or analyzed

---

### 12. **School Performance Analytics** ⏳ TODO
**What's Missing**:
- School ratings by neighborhood
- Price premium for good schools
- School district comparisons
- Correlation between school ratings and home values

**User Questions We Can't Answer**:
- "What are the school ratings in this area?"
- "How much more do homes cost near top-rated schools?"
- "Which neighborhoods have the best schools?"

**Data We Have**:
- ✅ School data exists in separate collection
- ❌ Not integrated with property analytics

---

### 13. **Seasonal Trends** ⏳ TODO
**What's Missing**:
- Best month to buy/sell
- Seasonal price variations
- Seasonal inventory changes
- Holiday effects on market

**User Questions We Can't Answer**:
- "When is the best time to sell?"
- "Do prices drop in winter?"
- "Is there more inventory in spring?"

**Data We Have**:
- ✅ `listingDate`, `modificationTimestamp` fields
- ✅ `closeDate` in closed sales
- ❌ Not analyzed seasonally

---

## 🟢 Nice-to-Have Features (Lower Priority)

### 14. **Investment Score** ⏳ TODO
**What's Missing**:
- Composite investment score (0-100)
- Weighted factors: appreciation, cash flow, rental yield, location
- Risk assessment
- Investment grade classification

**User Questions We Can't Answer**:
- "Which properties are the best investments?"
- "Give me a score for this property's investment potential"
- "What's the investment grade of this neighborhood?"

---

### 15. **Walkability & Lifestyle Scores** ⏳ TODO
**What's Missing**:
- Walk score integration
- Transit score
- Bike score
- Nearby amenities count (restaurants, parks, shopping)

**User Questions We Can't Answer**:
- "How walkable is this neighborhood?"
- "Are there good restaurants nearby?"
- "Can I bike to work from here?"

**Data We Have**:
- ❌ Would need to integrate Walk Score API
- ❌ Would need Yelp/Google Places API

---

### 16. **Property Sales History Tracking** ⏳ TODO
**What's Missing**:
- Properties sold multiple times (flip tracking)
- Per-property appreciation
- Flip frequency by neighborhood
- Average time between sales

**User Questions We Can't Answer**:
- "How often do properties sell in this area?"
- "Has this property been flipped?"
- "What did the last owner pay for this?"

**Data We Have**:
- ✅ Closed sales data
- ✅ `listingKey` to track same property
- ❌ Not tracking sales history over time

---

### 17. **Crime Statistics** ⏳ TODO
**What's Missing**:
- Crime rates by neighborhood
- Crime trends
- Safety scores
- Correlation with property values

**User Questions We Can't Answer**:
- "Is this neighborhood safe?"
- "What's the crime rate here?"
- "Are home values affected by crime?"

**Data We Have**:
- ❌ Would need to integrate crime data API

---

### 18. **Demographic Analytics** ⏳ TODO
**What's Missing**:
- Population growth trends
- Age demographics
- Income levels
- Employment data
- Migration patterns

**User Questions We Can't Answer**:
- "Is this area growing?"
- "What's the average household income?"
- "Are young families moving here?"

**Data We Have**:
- ❌ Would need US Census API integration

---

### 19. **Mortgage Rate Impact Analysis** ⏳ TODO
**What's Missing**:
- Affordability index
- Monthly payment estimator
- Rate change impact on buying power
- Historical affordability trends

**User Questions We Can't Answer**:
- "How do current rates affect affordability?"
- "What would my monthly payment be?"
- "How much home can I afford at current rates?"

**Data We Have**:
- ✅ `/api/mortgage-rates` endpoint exists
- ❌ Not integrated with property analytics

---

### 20. **Luxury vs Standard Market Segmentation** ⏳ TODO
**What's Missing**:
- Luxury market definition by location
- Luxury vs standard appreciation comparison
- Luxury market trends
- Ultra-luxury segment analysis

**User Questions We Can't Answer**:
- "How is the luxury market performing?"
- "Where's the line between standard and luxury?"
- "Do luxury homes appreciate faster?"

---

### 21. **New Construction vs Resale Analytics** ⏳ TODO
**What's Missing**:
- New construction inventory
- New vs resale price comparison
- Builder incentives tracking
- New development impact on resale market

**User Questions We Can't Answer**:
- "Should I buy new or resale?"
- "How much more expensive is new construction?"
- "Is new construction taking market share?"

**Data We Have**:
- ✅ `newConstructionYN` field in some listings
- ❌ Not consistently populated
- ❌ Not analyzed

---

### 22. **Foreclosure & Distressed Sales** ⏳ TODO
**What's Missing**:
- Foreclosure rates by area
- REO inventory
- Short sale tracking
- Distressed sale impact on comps

**User Questions We Can't Answer**:
- "Are there foreclosures in this area?"
- "How many distressed sales nearby?"
- "Is this a foreclosure hotspot?"

**Data We Have**:
- ❌ Would need foreclosure data source

---

### 23. **Condo vs SFR Market Comparison** ⏳ TODO
**What's Missing**:
- Condo appreciation vs SFR
- Condo inventory trends
- HOA fee impact analysis
- Condo market health indicators

**User Questions We Can't Answer**:
- "Do condos appreciate as fast as houses?"
- "Is the condo market stronger than SFR?"
- "What's the condo vs house price gap?"

**Data We Have**:
- ✅ `propertySubType` field distinguishes them
- ❌ Not compared or analyzed separately

---

### 24. **Vacation Rental Potential** ⏳ TODO
**What's Missing**:
- STR regulations by city
- Estimated STR income
- Occupancy rate estimates
- STR hotspots

**User Questions We Can't Answer**:
- "Can I Airbnb this property?"
- "What could I make as a vacation rental?"
- "Which areas allow short-term rentals?"

**Data We Have**:
- ❌ Would need STR regulation database
- ❌ Would need AirDNA or similar API

---

### 25. **Climate Risk Analytics** ⏳ TODO
**What's Missing**:
- Flood risk scores
- Fire risk zones
- Earthquake risk
- Climate change impact projections
- Insurance cost implications

**User Questions We Can't Answer**:
- "Is this property in a flood zone?"
- "What's the wildfire risk?"
- "Will climate change affect property values?"

**Data We Have**:
- ❌ Would need FEMA flood maps
- ❌ Would need CAL FIRE data
- ❌ Would need climate risk APIs

---

## 📊 Summary by Category

| Category | Current | Planned | % Complete |
|----------|---------|---------|------------|
| **Investment Analytics** | 1 (Appreciation) | 6 | 17% |
| **Market Analytics** | 0 | 8 | 0% |
| **Location Analytics** | 0 | 5 | 0% |
| **Property Analytics** | 0 | 4 | 0% |
| **Risk Analytics** | 0 | 2 | 0% |
| **Total** | **1** | **25** | **4%** |

---

## 🎯 Recommended Implementation Order

### Phase 1 (Next 2 weeks) - Core Investment Analytics
1. **Cash Flow Calculator** - Most requested
2. **ROI & Cap Rate** - Pairs with cash flow
3. **Days on Market** - Easy to implement
4. **Price Per Sqft** - Easy to implement

### Phase 2 (Weeks 3-4) - Market Intelligence
5. **CMA Generator** - High value for agents
6. **Rental Yield Analysis** - Completes investment trilogy
7. **List vs Sale Price** - Market sentiment indicator
8. **Inventory Analysis** - Supply/demand metrics

### Phase 3 (Month 2) - Location & Property
9. **HOA Fee Analysis** - Already have data
10. **Property Tax Analysis** - Important for buyers
11. **Price Reduction Trends** - Market health indicator
12. **Seasonal Trends** - Timing guidance

### Phase 4 (Month 3) - Advanced Features
13. **Investment Score** - Composite metric
14. **Property Sales History** - Flip tracking
15. **School Analytics** - Family buyers
16. **Condo vs SFR Comparison** - Market segmentation

### Phase 5 (Future) - External Integrations
17. **Walkability Scores** - Requires API
18. **Crime Statistics** - Requires API
19. **Demographics** - Requires Census API
20. **Climate Risk** - Requires multiple APIs

---

## 💡 Quick Wins (Can Build This Week)

These require minimal work since we already have the data:

1. **Average Price Per Sqft by Location** - Just query and divide
2. **Days on Market Statistics** - Already in database
3. **HOA Fee Ranges** - Already in database
4. **Property Tax Estimates** - Already in database (partial)
5. **Price Distribution Histograms** - Simple aggregation

---

## ❌ What We CAN'T Do Without External Data

These require data we don't have:

- Rental comps (need to scrape rental listings)
- Walkability scores (need Walk Score API)
- Crime data (need crime API)
- Demographics (need Census API)
- Climate risk (need FEMA/CAL FIRE)
- Foreclosure data (need specialized data source)
- STR regulations (need manual research or API)

---

## 🚀 Next Steps

1. **Review this list with stakeholders**
2. **Prioritize based on user demand**
3. **Start with Phase 1 (Cash Flow + ROI)**
4. **Build one feature per week**
5. **Launch with AI integration**

---

**Current Status**: 1/25 features complete (4%)
**Target**: 13/25 features by end of Q1 2026 (52%)
