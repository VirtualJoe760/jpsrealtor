# Real Estate Analytics API

This namespace holds **two surfaces with opposite rules.** Read this before
adding a route — putting one in the other's half is a silent architecture
break, not a style question.

| | Calculation surface | Read surface |
|---|---|---|
| Routes | `appreciation`, `cashflow`, `compare`, `cma` | `sales-grid`, `hotspots`, `areas` |
| Library | `src/lib/analytics/{calculations,aggregators}` | `src/lib/analytics/heatmap` |
| Computes? | **Yes** — that is its job | **Never** |
| Data | live listing collections | precomputed collections |
| Consumer | AI answers, dynamic cards | the Analytics tab heat map |

**The read surface never calculates.** Every number it returns is a stored
field; each function is a `find` with a filter, a projection and a sort. No
`$group`, no `$geoNear` aggregation, no arithmetic over rows after the fetch.
If the tab needs a number that is not stored, it is **requested as a precompute
field** rather than computed here. `lib/analytics/heatmap` must not import from
`calculations/` or `aggregators/`.

Everything below this line documents the **calculation** surface. The read
surface is documented in `docs/analytics/sales-heatmap.md`.

> Status note: the checklist at the bottom of this file predates the code —
> `appreciation/route.ts` ships but is listed unchecked. Treat it as stale.

---

## Quick Start

```typescript
// Get appreciation data
fetch('/api/analytics/appreciation?location=Indian Wells Country Club&period=5y')

// Compare neighborhoods
fetch('/api/analytics/compare', {
  method: 'POST',
  body: JSON.stringify({
    locations: ["Indian Wells CC", "Palm Desert CC"],
    metrics: ["appreciation", "cashflow"]
  })
})

// Generate CMA
fetch('/api/analytics/cma', {
  method: 'POST',
  body: JSON.stringify({
    subject: { address: "123 Main St", beds: 3, baths: 2, sqft: 2200 },
    radius: 0.5
  })
})
```

---

## Available Endpoints

### Index
```
GET /api/analytics
```
Returns list of all analytics endpoints with documentation

### Appreciation Analysis
```
GET /api/analytics/appreciation
Query Parameters:
- location: subdivision, city, or zip code
- period: 1y, 3y, 5y, 10y (default: 5y)
- propertyType: A, B, C, D (optional)
```

### Cash Flow Analysis
```
POST /api/analytics/cashflow
Body: {
  purchasePrice: number,
  downPayment: number,
  interestRate: number,
  location: string,
  propertyType?: string,
  assumptions?: {...}
}
```

### Comparison
```
POST /api/analytics/compare
Body: {
  locations: string[],
  metrics: string[],
  period?: string
}
```

### CMA Generation
```
POST /api/analytics/cma
Body: {
  subject: {
    address: string,
    beds: number,
    baths: number,
    sqft: number,
    features?: string[]
  },
  radius: number,
  maxAge?: number
}
```

---

## Response Format

All endpoints return:
```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "metadata": {
    "calculatedAt": "2025-12-08T10:30:00.000Z",
    "sampleSize": 47,
    "confidence": "high",
    "dataFreshness": "real-time"
  }
}
```

---

## Calculation Library

The analytics system uses a modular calculation library:

```
src/lib/analytics/
├── calculations/       # Core formulas
│   ├── appreciation.ts
│   ├── cashflow.ts
│   ├── roi.ts
│   ├── cma.ts
│   └── rental-yield.ts
├── aggregators/        # Data aggregation
├── comparators/        # Comparison logic
└── utils/              # Helper functions
```

---

## Use Cases

### AI Assistant
```
User: "Which neighborhood has better appreciation?"
AI: Uses /api/analytics/compare
```

### Map Visualization
```
User hovers over subdivision
Map: Fetches /api/analytics/appreciation for that area
```

### Investment Analysis
```
User: "Analyze cash flow for $500k property"
System: Uses /api/analytics/cashflow
```

---

## Data Sources

- **Active Listings**: UnifiedListing collection
- **Closed Sales**: GPSClosedListing, CRMLSClosedListing
- **Rental Comps**: Listings where propertyType = 'B'
- **Geographic Data**: City, County, Subdivision collections

---

## Implementation Status

✅ **Phase 1 - Foundation** (Current)
- [x] Architecture designed
- [x] Directory structure created
- [x] Appreciation calculation module
- [ ] Appreciation API endpoint
- [ ] API index endpoint

⏳ **Phase 2 - Cash Flow** (Next)
- [ ] Cash flow calculations
- [ ] Rental comp finder
- [ ] ROI metrics
- [ ] Cash flow API endpoint

🔮 **Phase 3 - Comparison & CMA** (Future)
- [ ] Neighborhood comparator
- [ ] CMA generator
- [ ] Compare API endpoint
- [ ] CMA API endpoint

🔮 **Phase 4 - AI Integration** (Future)
- [ ] AI tool definitions
- [ ] Optimized AI endpoints
- [ ] Natural language processing

---

## Next Steps

1. Complete appreciation API endpoint
2. Test with real subdivision data
3. Build cash flow module
4. Integrate with AI assistant

---

See [REAL_ESTATE_ANALYTICS_ARCHITECTURE.md](../../../../docs/REAL_ESTATE_ANALYTICS_ARCHITECTURE.md) for full architectural documentation.
