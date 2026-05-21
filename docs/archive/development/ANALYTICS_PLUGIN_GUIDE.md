# Analytics Plug-and-Play System

**Date**: December 9, 2025
**Version**: 1.0.0
**Architecture**: Modular & Scalable

---

## 🎯 Overview

The analytics system uses a **plug-and-play architecture** similar to your theme system. Add new data sources, metrics, or calculations without changing existing code.

**Think of it like themes**:
- Themes: Create theme → Export from index → Use anywhere
- Analytics: Create metric → Export from index → Use anywhere

---

## 📁 Directory Structure

```
src/lib/analytics/
├── index.ts                    ← Central registry (START HERE)
│
├── calculations/               ← Pure calculation functions
│   ├── index.ts               ← Register calculations here
│   ├── appreciation.ts        ← Appreciation metrics ✅
│   ├── cashflow.ts            ← Cash flow (TODO)
│   └── roi.ts                 ← ROI calculations (TODO)
│
├── aggregators/                ← Data fetching from MongoDB
│   ├── index.ts               ← Register aggregators here
│   ├── closed-sales.ts        ← Closed sales aggregator ✅
│   └── active-listings.ts     ← Active listings (TODO)
│
├── comparators/                ← Multi-entity comparison
│   ├── index.ts               ← Register comparators here
│   └── locations.ts           ← Location comparison (TODO)
│
└── utils/                      ← Helper functions
    ├── index.ts               ← Register utilities here
    ├── validators.ts          ← Input validation (TODO)
    └── formatters.ts          ← Output formatting (TODO)
```

---

## 🔌 How to Add New Functionality

### Pattern 1: Add a New Metric (e.g., Cash Flow)

**Step 1**: Create calculation function

```typescript
// File: src/lib/analytics/calculations/cashflow.ts

export interface CashFlowResult {
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  annualCashFlow: number;
}

export function calculateCashFlow(
  rentPrice: number,
  mortgage: number,
  hoa: number,
  taxes: number,
  insurance: number
): CashFlowResult {
  const monthlyIncome = rentPrice;
  const monthlyExpenses = mortgage + hoa + (taxes / 12) + (insurance / 12);
  const netCashFlow = monthlyIncome - monthlyExpenses;

  return {
    monthlyIncome,
    monthlyExpenses,
    netCashFlow,
    annualCashFlow: netCashFlow * 12
  };
}
```

**Step 2**: Export from index

```typescript
// File: src/lib/analytics/calculations/index.ts

export * from './appreciation';
export * from './cashflow';  // ← ADD THIS
```

**Step 3**: Create API endpoint

```typescript
// File: src/app/api/analytics/cashflow/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { calculateCashFlow } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = calculateCashFlow(
    parseFloat(searchParams.get('rent') || '0'),
    parseFloat(searchParams.get('mortgage') || '0'),
    parseFloat(searchParams.get('hoa') || '0'),
    parseFloat(searchParams.get('taxes') || '0'),
    parseFloat(searchParams.get('insurance') || '0')
  );

  return NextResponse.json(result);
}
```

**Done!** You can now use it:

```typescript
// From anywhere in the app
import { calculateCashFlow } from '@/lib/analytics';

const result = calculateCashFlow(3000, 2000, 300, 600, 150);
// { monthlyIncome: 3000, netCashFlow: -50, ... }
```

---

### Pattern 2: Add a New Data Source (e.g., Commercial Properties)

**Step 1**: Create aggregator

```typescript
// File: src/lib/analytics/aggregators/commercial-sales.ts

import { connectToDatabase } from '@/lib/mongodb';

export interface CommercialSale {
  listingKey: string;
  closePrice: number;
  closeDate: Date;
  propertySubType?: string;  // Office, Retail, Industrial
  // ... other fields
}

export async function getCommercialSales(filters: {
  city?: string;
  propertySubType?: string;
  yearsBack?: number;
}): Promise<CommercialSale[]> {
  const db = await connectToDatabase();

  const query: any = {};

  if (filters.city) {
    query.city = filters.city;
  }

  if (filters.propertySubType) {
    query.propertySubType = filters.propertySubType;
  }

  if (filters.yearsBack) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - filters.yearsBack);
    query.closeDate = { $gte: cutoffDate };
  }

  return await db.collection('commercial_closed_listings')
    .find(query)
    .toArray();
}
```

**Step 2**: Export from index

```typescript
// File: src/lib/analytics/aggregators/index.ts

export * from './closed-sales';
export * from './commercial-sales';  // ← ADD THIS
```

**Step 3**: Use in any API endpoint

```typescript
import { getCommercialSales, analyzeAppreciation } from '@/lib/analytics';

const sales = await getCommercialSales({ city: 'Palm Desert', yearsBack: 5 });
const result = analyzeAppreciation(sales, '5y');
```

**Done!** Commercial sales now flow through the same analytics pipeline.

---

### Pattern 3: Add a New MLS Association

**This is the easiest!** No code changes needed.

**Step 1**: Add MLS ID to fetch script

```python
# File: src/scripts/mls/backend/unified/closed/fetch.py

MLS_IDS = {
    "GPS": "20190211172710340762000000",
    "CRMLS": "20200218121507636729000000",
    # ... existing MLSs
    "NEW_MLS": "20251209000000000000000000"  # ← ADD THIS
}
```

**Step 2**: Run fetch script

```bash
python src/scripts/mls/backend/unified/closed/fetch.py -y
python src/scripts/mls/backend/unified/closed/seed.py
```

**Done!** The new MLS data automatically:
- Flows into `unified_closed_listings` collection
- Works with all existing aggregators
- Powers all existing API endpoints
- No code changes needed!

---

### Pattern 4: Add a New Filter Type

**Step 1**: Add to interface

```typescript
// File: src/lib/analytics/aggregators/closed-sales.ts

export interface ClosedSalesFilters {
  // ... existing filters
  hasPool?: boolean;  // ← ADD THIS
}
```

**Step 2**: Add query logic

```typescript
// In getClosedSales() function

if (filters.hasPool !== undefined) {
  query.poolYN = filters.hasPool;
}
```

**Done!** Now available everywhere:

```typescript
const sales = await getClosedSales({
  city: 'Palm Desert',
  hasPool: true  // ← NEW FILTER
});
```

---

## 🎨 Real-World Examples

### Example 1: Add School Ratings

**1. Create aggregator**:
```typescript
// aggregators/school-ratings.ts
export async function getSchoolRatings(filters: { zip?: string }) {
  // Fetch from schools API or database
}
```

**2. Export**:
```typescript
// aggregators/index.ts
export * from './school-ratings';
```

**3. Use in appreciation API**:
```typescript
// api/analytics/appreciation/route.ts
import { getSchoolRatings } from '@/lib/analytics';

const schoolRatings = await getSchoolRatings({ zip: params.zip });

return NextResponse.json({
  ...result,
  schoolRatings  // ← Added without touching existing logic
});
```

### Example 2: Add Crime Statistics

**1. Create aggregator**:
```typescript
// aggregators/crime-stats.ts
export async function getCrimeStats(filters: { city?: string }) {
  // Fetch crime data
}
```

**2. Export**:
```typescript
// aggregators/index.ts
export * from './crime-stats';
```

**3. Use anywhere**:
```typescript
import { getCrimeStats } from '@/lib/analytics';
const crimeData = await getCrimeStats({ city: 'Palm Desert' });
```

### Example 3: Add HOA Fees Analysis

**1. Add to closed-sales aggregator**:
```typescript
interface ClosedSalesFilters {
  hasHOA?: boolean;
  maxHOAFee?: number;  // ← ADD
}

// In getClosedSales()
if (filters.maxHOAFee) {
  query.associationFee = { $lte: filters.maxHOAFee };
}
```

**2. Use immediately**:
```typescript
const sales = await getClosedSales({
  city: 'Palm Desert',
  maxHOAFee: 500
});
```

---

## 🔄 System Flow

```
1. Data Source (MLS) → fetch.py
                         ↓
2. MongoDB Collection → unified_closed_listings
                         ↓
3. Aggregator → getClosedSales() [filters data]
                         ↓
4. Calculation → analyzeAppreciation() [pure function]
                         ↓
5. API Endpoint → /api/analytics/appreciation [returns JSON]
                         ↓
6. Consumer → AI, Frontend, Mobile App
```

**Key Point**: Each layer is independent. Change one without affecting others.

---

## 📊 Comparison to Theme System

| Theme System | Analytics System |
|--------------|------------------|
| Create theme file | Create calculation file |
| Export from themes/index.ts | Export from calculations/index.ts |
| Import in components | Import in API routes |
| Apply theme | Call function |
| Plug-and-play ✅ | Plug-and-play ✅ |

**Same pattern, different domain!**

---

## ✅ Benefits

1. **Scalability**: Add new MLSs without code changes
2. **Modularity**: Each component is independent
3. **Reusability**: One aggregator, many endpoints
4. **Testability**: Pure functions are easy to test
5. **Maintainability**: Clear separation of concerns
6. **Extensibility**: Add new features without breaking existing ones

---

## 🚀 Quick Reference

### Adding Something New?

| What | Where | Export From | Use From |
|------|-------|-------------|----------|
| **Calculation** | `calculations/{name}.ts` | `calculations/index.ts` | `@/lib/analytics` |
| **Aggregator** | `aggregators/{name}.ts` | `aggregators/index.ts` | `@/lib/analytics` |
| **Comparator** | `comparators/{name}.ts` | `comparators/index.ts` | `@/lib/analytics` |
| **Utility** | `utils/{name}.ts` | `utils/index.ts` | `@/lib/analytics` |
| **API Endpoint** | `api/analytics/{name}/route.ts` | N/A | HTTP GET/POST |

### Import Pattern

```typescript
// Single import, get everything
import {
  getClosedSales,
  analyzeAppreciation,
  calculateCAGR,
  // ... everything you need
} from '@/lib/analytics';
```

---

## 📝 Summary

**The analytics system is designed to be as easy as adding a theme:**

1. **Create** your module file
2. **Export** from the index
3. **Use** anywhere

That's it! No boilerplate, no configuration, just plug-and-play functionality.

**New MLS joins?** Add to `MLS_IDS`, run fetch, done.
**New metric needed?** Create calculation, export, use.
**New filter?** Add to interface, add query logic, done.

The system grows with your needs without increasing complexity.

---

**Questions?** Check the inline documentation in each file for examples and patterns.
