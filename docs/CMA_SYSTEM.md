# Comparative Market Analysis (CMA) System

## Overview

The CMA system provides comprehensive market analysis tools for real estate properties, including price comparisons, market statistics, and comparable property analysis. The system is fully integrated with both page components and the chat interface for real-time analysis.

## Features

- **Automated Comparable Selection**: Intelligently finds and ranks similar properties
- **Similarity Scoring**: 0-100 score based on property characteristics
- **Market Statistics**: Average/median prices, days on market, price per sqft
- **Property Valuation**: Estimate property values based on comparables
- **Interactive Charts**: Recharts-powered visualizations
- **Theme Support**: Full light/dark mode compatibility
- **Chat Integration**: CMA reports can be displayed in chat messages

## Installation

The system uses Recharts for charting. Install if not already present:

```bash
npm install recharts
```

## API Usage

### Generate CMA Report

**Endpoint**: `POST /api/cma/generate`

**Request Body**:
```json
{
  "listingKey": "string",
  "filters": {
    "radius": 2,
    "minPrice": 300000,
    "maxPrice": 800000,
    "minBeds": 2,
    "maxBeds": 5,
    "minBaths": 2,
    "standardStatus": ["Active", "Closed"],
    "timeframe": 6,
    "maxComps": 10
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subjectProperty": { ... },
    "comparableProperties": [ ... ],
    "marketStatistics": { ... },
    "priceTrends": [ ... ],
    "generatedAt": "2025-01-22T...",
    "radius": 2,
    "timeframe": 6
  }
}
```

## Component Usage

### 1. CMA Report Component (Full Report)

```tsx
import CMAReport from "@/app/components/cma/CMAReport";

// In your page/component
const report = await fetch('/api/cma/generate', {
  method: 'POST',
  body: JSON.stringify({ listingKey: "ABC123" })
}).then(r => r.json());

<CMAReport report={report.data} />
```

### 2. Individual Chart Components

#### Price Comparison Chart
```tsx
import PriceComparisonChart from "@/app/components/cma/PriceComparisonChart";

<PriceComparisonChart
  subject={subjectProperty}
  comparables={comparables}
/>
```

#### Market Statistics Card
```tsx
import MarketStatsCard from "@/app/components/cma/MarketStatsCard";

<MarketStatsCard statistics={marketStatistics} />
```

#### Comparables Table
```tsx
import ComparablesTable from "@/app/components/cma/ComparablesTable";

<ComparablesTable
  subject={subjectProperty}
  comparables={comparables}
/>
```

### 3. Chat Integration

```tsx
import CMAMessage from "@/app/components/chat/CMAMessage";

// In your chat message renderer
{message.type === 'cma' && (
  <CMAMessage report={message.cmaReport} />
)}
```

## Utility Functions

### Calculate Distance

```typescript
import { calculateDistance } from "@/utils/cma/calculator";

const distance = calculateDistance(
  lat1, lon1, // Subject property
  lat2, lon2  // Comparable property
);
// Returns distance in miles
```

### Calculate Similarity Score

```typescript
import { calculateSimilarityScore } from "@/utils/cma/calculator";

const score = calculateSimilarityScore(subjectProperty, comparable);
// Returns 0-100 score
```

### Filter and Rank Comparables

```typescript
import { filterAndRankComps } from "@/utils/cma/calculator";

const topComps = filterAndRankComps(
  subjectProperty,
  allListings,
  {
    radius: 2,
    maxComps: 10,
    standardStatus: ["Active", "Closed"]
  }
);
```

### Estimate Property Value

```typescript
import { estimatePropertyValue } from "@/utils/cma/calculator";

const { estimated, low, high } = estimatePropertyValue(
  subjectProperty,
  comparables
);
```

## Similarity Scoring Algorithm

Properties are scored 0-100 based on:

| Factor | Max Points | Calculation |
|--------|-----------|-------------|
| Price difference | -30 | Based on % difference from subject |
| Square footage | -20 | Based on % difference from subject |
| Bedrooms | -15 | 5 points per bedroom difference |
| Bathrooms | -15 | 7.5 points per bathroom difference |
| Year built | -10 | 1 point per 10 years difference |
| Distance | -10 | 2 points per mile |

Score >= 80 = Excellent match
Score 60-79 = Good match
Score < 60 = Fair match

## Valuation Methods

### 1. Price Per Square Foot Method (Primary)
If subject property has living area:
```
estimated_value = avg_price_per_sqft × subject_sqft
```

### 2. Weighted Average Method (Fallback)
```
estimated_value = Σ(comp_price × similarity_weight) / Σ(similarity_weights)
```

## Database Queries

The system uses MongoDB with geospatial queries:

```javascript
// Find properties within radius
const query = {
  latitude: { $gte: lat - delta, $lte: lat + delta },
  longitude: { $gte: lon - delta, $lte: lon + delta },
  standardStatus: { $in: ["Active", "Closed"] },
  bedroomsTotal: { $gte: beds - 1, $lte: beds + 1 }
};
```

## Chart Customization

All charts support theme-aware colors:

- **Light Mode**: Blue primary (#3B82F6), gray neutrals
- **Dark Mode**: Cyan/emerald gradients, dark backgrounds

Charts automatically adjust based on `useTheme()` hook.

## Performance Considerations

1. **Radius Optimization**: Default 2-mile radius balances coverage with performance
2. **Comp Limits**: Default max 10 comparables for optimal chart rendering
3. **Timeframe**: 6-month default for sold properties
4. **Database Indexing**: Ensure indexes on:
   - `latitude`, `longitude` (geospatial)
   - `standardStatus`
   - `listPrice`, `closePrice`
   - `bedroomsTotal`, `bathroomsTotalInteger`

## Future Enhancements

- [ ] Price trend analysis (historical data required)
- [ ] PDF export functionality
- [ ] Email CMA reports
- [ ] Saved CMA templates
- [ ] Neighborhood-specific analysis
- [ ] Seasonal adjustment factors
- [ ] Custom weighting for similarity scoring

## Example: Complete Workflow

```typescript
// 1. Generate CMA Report
const response = await fetch('/api/cma/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    listingKey: "ABC123",
    filters: {
      radius: 3,
      maxComps: 8,
      standardStatus: ["Active", "Closed"],
      timeframe: 6
    }
  })
});

const { data: report } = await response.json();

// 2. Display in page
<CMAReport report={report} />

// 3. Or use in chat
<CMAMessage report={report} />

// 4. Access individual components
<PriceComparisonChart
  subject={report.subjectProperty}
  comparables={report.comparableProperties}
/>

<MarketStatsCard statistics={report.marketStatistics} />
```

## Troubleshooting

### No Comparables Found
- Increase radius parameter
- Relax filters (beds, baths, price range)
- Check subject property has valid latitude/longitude

### Inaccurate Valuations
- Ensure sufficient comparables (minimum 5 recommended)
- Verify comparable properties have living area data
- Check for outliers in price per sqft

### Chart Not Rendering
- Verify Recharts is installed
- Check browser console for errors
- Ensure data has required fields (price, name, etc.)

## Support

For issues or questions:
1. Check this documentation
2. Review component prop types in TypeScript
3. Examine example usage in `src/app/components/cma/`
4. Contact development team

---

**Last Updated**: January 22, 2025
**Version**: 1.0
