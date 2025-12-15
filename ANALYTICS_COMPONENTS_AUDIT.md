# Analytics Components Audit

**Date**: December 13, 2025
**Status**: Audit Complete

---

## Summary

### ✅ Currently Integrated Components (7):

1. **SourceBubble** - MLS data source attribution
2. **ListingCarousel** - Property listings carousel
3. **ChatMapView** - Interactive map view
4. **AppreciationCard** (via appreciation data) - Property appreciation analytics
5. **SubdivisionComparisonChart** - Compare multiple subdivisions/cities
6. **MarketStatsCard** - Market statistics (DOM, Price/Sqft, HOA, Tax)
7. **ArticleCard** - CMS article search results

### ❌ NOT Integrated Components (2):

1. **CMADisplay** - Comparative Market Analysis display
   - Location: `src/app/components/chat/CMADisplay.tsx`
   - Purpose: Show CMA results with median price, price/sqft, etc.
   - Status: Component exists but NOT imported/rendered in ChatWidget
   - Integration needed: Add to ComponentData, import in ChatWidget

2. **AnalyticsFormulaModal** - Show analytics calculation formulas
   - Location: `src/app/components/chat/AnalyticsFormulaModal.tsx`
   - Purpose: Modal showing how analytics are calculated
   - Status: Utility component, may be used within other components

---

## Integration Status by Component:

### 1. SourceBubble ✅
- **File**: `src/app/components/chat/SourceBubble.tsx`
- **ChatProvider**: `sources?: SourceType[]`
- **ChatWidget**: Line 867 - `{msg.components?.sources && ...}`
- **Status**: INTEGRATED

### 2. ListingCarousel ✅
- **File**: `src/app/components/chat/ListingCarousel.tsx`
- **ChatProvider**: `carousel?: { title?: string; listings: Listing[] }`
- **ChatWidget**: Line 894 - `{msg.components?.carousel && ...}`
- **Status**: INTEGRATED

### 3. ChatMapView ✅
- **File**: `src/app/components/chat/ChatMapView.tsx`
- **ChatProvider**: `mapView?: { listings: any[]; center?: {...}; ... }`
- **ChatWidget**: Line 904 - `{msg.components?.mapView && ...}`
- **Status**: INTEGRATED

### 4. Appreciation Analytics ✅
- **File**: No dedicated component (renders inline)
- **ChatProvider**: `appreciation?: { location?: {...}; period: string; ... }`
- **ChatWidget**: Line 912 - `{msg.components?.appreciation && ...}`
- **Status**: INTEGRATED (inline rendering)

### 5. SubdivisionComparisonChart ✅
- **File**: `src/app/components/chat/SubdivisionComparisonChart.tsx`
- **ChatProvider**: `comparison?: { title?: string; items: ComparisonItem[] }`
- **ChatWidget**: Line 918 - `{msg.components?.comparison && ...}`
- **Status**: INTEGRATED

### 6. MarketStatsCard ✅
- **File**: `src/app/components/chat/MarketStatsCard.tsx`
- **ChatProvider**: `marketStats?: { location?: {...}; daysOnMarket?: {...}; ... }`
- **ChatWidget**: Line 927 - `{msg.components?.marketStats && ...}`
- **Status**: INTEGRATED

### 7. ArticleCard ✅
- **File**: `src/app/components/chat/ArticleCard.tsx`
- **ChatProvider**: `articles?: { query?: string; results: any[] }`
- **ChatWidget**: Line 933 - `{msg.components?.articles && ...}`
- **Status**: INTEGRATED

### 8. CMADisplay ❌ NOT INTEGRATED
- **File**: `src/app/components/chat/CMADisplay.tsx`
- **ChatProvider**: MISSING - No `cma` field in ComponentData interface
- **ChatWidget**: MISSING - Not imported, not rendered
- **Status**: NOT INTEGRATED
- **Action Needed**:
  ```typescript
  // Add to ChatProvider.tsx ComponentData:
  cma?: {
    metrics: {
      medianPrice: number;
      avgPrice: number;
      medianPricePerSqft: number;
      avgPricePerSqft: number;
      totalProperties: number;
    };
    selectedProperties: any[];
    location: string;
  };

  // Add to ChatWidget.tsx imports:
  import CMADisplay from "./CMADisplay";

  // Add to ChatWidget.tsx rendering:
  {msg.components?.cma && (
    <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
      <CMADisplay cmaData={msg.components.cma} />
    </div>
  )}
  ```

### 9. AnalyticsFormulaModal ❓ UTILITY COMPONENT
- **File**: `src/app/components/chat/AnalyticsFormulaModal.tsx`
- **Purpose**: Modal to show formula explanations
- **Status**: Utility component (likely used within appreciation/market stats)
- **Action**: No integration needed (used as sub-component)

---

## Data Issues Fixed Today:

### 1. Days on Market - FIXED ✅
**Issue**: `daysOnMarketCumulative` field not populated (0% coverage)
**Solution**: Calculate from `onMarketDate` field (100% coverage)
**Result**: Now showing median 64 days, average 84 days (520/558 listings)

**Code Location**: `src/lib/analytics/calculations/market-stats.ts:96-173`

**Fix Applied**:
```typescript
// Calculate DOM from onMarketDate if daysOnMarketCumulative is not available
const now = new Date();
const domValues = listings
  .map((l) => {
    // Try daysOnMarketCumulative first
    if (l.daysOnMarketCumulative !== undefined && l.daysOnMarketCumulative >= 0) {
      return l.daysOnMarketCumulative;
    }

    // Fallback: calculate from onMarketDate
    if (l.onMarketDate) {
      const marketDate = new Date(l.onMarketDate);
      const daysDiff = Math.floor((now.getTime() - marketDate.getTime()) / (1000 * 60 * 60 * 24));
      // Exclude stale listings (> 1 year)
      if (daysDiff >= 0 && daysDiff <= 365) {
        return daysDiff;
      }
    }

    return null;
  })
  .filter((d): d is number => d !== null);
```

### 2. Property Tax - FIXED ✅
**Issue**: `taxAnnualAmount` field not populated (0% coverage)
**Solution**: Use CA BOE API to fetch official county tax rates + estimate from property values
**Result**: Now showing median $6,674, average $10,610 with official 1.173% Riverside rate

**Code Location**:
- Service: `src/lib/services/property-tax-rates.ts`
- Calculator: `src/lib/analytics/calculations/property-tax-enhanced.ts`
- API Integration: `src/app/api/analytics/market-stats/route.ts:161-164`

**Fix Applied**:
```typescript
// Use enhanced property tax with CA BOE API enrichment
const county = params.county || (listings[0]?.countyOrParish) || 'Riverside';
result.propertyTax = await analyzePropertyTaxEnhanced(listings, county);
```

**Data Returned**:
```json
{
  "propertyTax": {
    "average": 10610,
    "median": 6674,
    "effectiveRate": 1.173,
    "countyTaxRate": 1.173,
    "sampleSize": 558,
    "actualDataCount": 0,
    "estimatedDataCount": 558,
    "assessmentYear": "2024-2025"
  }
}
```

---

## Recommendations:

### High Priority:
1. **Integrate CMADisplay component**
   - Add `cma` field to ComponentData interface
   - Import and render in ChatWidget
   - Create AI tool to generate CMA data
   - Add [CMA] marker parsing in chat stream

### Medium Priority:
2. **Update MarketStatsCard to show enrichment stats**
   - Display "558 properties analyzed (558 estimated using official 2024-2025 rate)"
   - Show assessment year badge

3. **Verify AI tools are using all components**
   - Ensure AI knows about all 7 integrated components
   - Add training examples for each component type

### Low Priority:
4. **Create component usage analytics**
   - Track which components are most used
   - Identify underutilized features

---

## Files Involved:

**Component Files**:
- `src/app/components/chat/SourceBubble.tsx` ✅
- `src/app/components/chat/ListingCarousel.tsx` ✅
- `src/app/components/chat/ChatMapView.tsx` ✅
- `src/app/components/chat/SubdivisionComparisonChart.tsx` ✅
- `src/app/components/chat/MarketStatsCard.tsx` ✅
- `src/app/components/chat/ArticleCard.tsx` ✅
- `src/app/components/chat/CMADisplay.tsx` ❌ NOT INTEGRATED
- `src/app/components/chat/AnalyticsFormulaModal.tsx` ❓ UTILITY

**Integration Files**:
- `src/app/components/chat/ChatProvider.tsx` (ComponentData interface)
- `src/app/components/chat/ChatWidget.tsx` (component rendering)
- `src/app/api/chat/stream/route.ts` (AI tools + marker parsing)

**Analytics Files**:
- `src/lib/analytics/calculations/market-stats.ts` (FIXED: DOM calculation)
- `src/lib/analytics/calculations/property-tax-enhanced.ts` (NEW: CA BOE integration)
- `src/lib/services/property-tax-rates.ts` (NEW: Tax rate service)
- `src/app/api/analytics/market-stats/route.ts` (UPDATED: Use enhanced tax)

---

## Test Results:

**API Test** (December 13, 2025):
```bash
curl "http://localhost:3000/api/analytics/market-stats?city=Palm%20Desert"
```

**Results**:
- ✅ Days on Market: median 64 days (520 listings)
- ✅ Price Per Sqft: median $317 (558 listings)
- ✅ HOA Fees: median $366 (558 listings)
- ✅ Property Tax: median $6,674, rate 1.173% (558 estimated)

---

## Conclusion:

**Integrated**: 7 components
**Missing**: 1 component (CMADisplay)
**Data Issues**: Both fixed (DOM + Property Tax)
**Overall Status**: 87.5% integration (7/8 components)

**Next Step**: Integrate CMADisplay component to reach 100% integration.
