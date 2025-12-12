# Property SubType Filtering Implementation

**Date**: December 9, 2025
**Status**: ✅ COMPLETE
**Priority**: CRITICAL

## 🎯 Problem Statement

User requirement:
> "In our db, there's property type, and for residential sale and residential lease (A & B), there is property subtype. It is VERY important we take the subtype into consideration in our analytics. Condos and single family are not comparable. These are things that need to be distinguished when returning data."

**Impact**: Mixing different property subtypes (Single Family, Condominium, Townhouse) in appreciation calculations produces inaccurate and misleading results. A condo appreciating at 3% vs a single-family home at 6% are NOT comparable.

## 📊 Property Types and SubTypes

### Property Types (Standard RESO)
- **A** - Residential Sale
- **B** - Residential Lease
- **C** - Commercial Sale
- **D** - Commercial Lease

### Property SubTypes (for A & B only)
- **Single Family** - Detached single-family residence
- **Condominium** - Condo unit
- **Townhouse** - Townhome/rowhouse
- **Mobile/Manufactured** - Mobile home

## ✅ Implementation Checklist

### 1. Data Layer (Aggregators)
**File**: `src/lib/analytics/aggregators/closed-sales.ts`

- [x] Added `propertySubType` to `ClosedSalesFilters` interface (line 37)
  ```typescript
  propertySubType?: string | string[];  // 'Single Family', 'Condominium', 'Townhouse', etc.
  ```

- [x] Added MongoDB query logic in `getClosedSales()` (lines 200-204)
  ```typescript
  if (filters.propertySubType) {
    query.propertySubType = Array.isArray(filters.propertySubType)
      ? { $in: filters.propertySubType }
      : filters.propertySubType;
  }
  ```

### 2. API Layer
**File**: `src/app/api/analytics/appreciation/route.ts`

- [x] Added `propertySubType` to query parameters interface (line 42)
  ```typescript
  propertySubType?: string;  // 'Single Family', 'Condominium', 'Townhouse', etc.
  ```

- [x] Implemented intelligent default logic (lines 94-100)
  ```typescript
  // IMPORTANT: Default to Single Family for residential (A) to avoid mixing condos/townhouses
  if (params.propertySubType) {
    filters.propertySubType = params.propertySubType;
  } else if (!params.propertyType || params.propertyType === 'A') {
    // Default to Single Family for residential queries
    filters.propertySubType = 'Single Family';
  }
  ```

### 3. AI Tool Integration
**File**: `src/app/api/chat/stream/route.ts`

- [x] Added `propertySubType` to tool definition (lines 97-101)
  ```typescript
  propertySubType: {
    type: "string",
    enum: ["Single Family", "Condominium", "Townhouse", "Mobile/Manufactured"],
    description: "Property subtype filter. Defaults to 'Single Family' for residential queries to avoid mixing condos/townhouses. Use 'Condominium' or 'Townhouse' only if user explicitly asks about condos or townhomes."
  }
  ```

- [x] Added parameter passing in tool execution handler (line 223)
  ```typescript
  if (functionArgs.propertySubType) params.append("propertySubType", functionArgs.propertySubType);
  ```

### 4. Database Indexes
**File**: `src/scripts/mls/backend/unified/closed/seed.py`

- [x] Added compound index for query performance (lines 153-162)
  ```python
  # 5a. PropertySubType + closeDate (CRITICAL for single family vs condo comparisons)
  collection.create_index(
      [("propertySubType", ASCENDING), ("closeDate", DESCENDING)],
      name="propertySubType_closeDate",
      sparse=True  # Not all property types have subtypes
  )
  ```

## 🔄 Data Flow

### User Query Flow
1. **User asks**: "What's the appreciation in Palm Desert?"
2. **AI interprets** as residential query (defaults to Single Family)
3. **Tool calls API**: `/api/analytics/appreciation?city=Palm+Desert&period=5y&propertySubType=Single+Family`
4. **API builds filters**: `{ city: "Palm Desert", yearsBack: 5, propertySubType: "Single Family" }`
5. **Aggregator queries MongoDB**:
   ```javascript
   {
     city: "Palm Desert",
     closeDate: { $gte: fiveYearsAgo },
     propertySubType: "Single Family"  // CRITICAL FILTER
   }
   ```
6. **Results** include ONLY single-family homes (no condos/townhouses)
7. **Calculation** produces accurate appreciation for comparable properties

### Condo-Specific Query Flow
1. **User asks**: "What about condos in Palm Desert?"
2. **AI recognizes** condo-specific request
3. **Tool calls API**: `/api/analytics/appreciation?city=Palm+Desert&period=5y&propertySubType=Condominium`
4. **Results** include ONLY condominiums
5. **Comparison** shows different appreciation rate (typically lower than single-family)

## 📈 Expected Impact

### Before (Mixing Property Types)
```
Palm Desert Appreciation (5y): 8.2% annual
  - Includes: 120 single-family, 80 condos, 15 townhouses
  - Problem: Averages different markets together
  - Result: MISLEADING - neither market appreciates at 8.2%
```

### After (Filtered by SubType)
```
Palm Desert Single Family (5y): 9.5% annual
  - Includes: 120 single-family homes only
  - Accurate representation of single-family market

Palm Desert Condominiums (5y): 5.8% annual
  - Includes: 80 condos only
  - Accurate representation of condo market
```

## 🎯 Default Behavior

### Residential Queries (Type A)
- **Default**: Single Family
- **Rationale**: Most user queries are about single-family homes
- **Override**: User must explicitly ask about condos/townhouses

### Commercial Queries (Type C, D)
- **Default**: No subtype filter
- **Rationale**: Commercial properties don't have meaningful subtypes in same way

### Examples
| User Query | Property Type | Property SubType | Reasoning |
|------------|---------------|------------------|-----------|
| "Appreciation in Palm Desert" | A (Residential) | Single Family | Default for residential |
| "Condo market in Palm Desert" | A (Residential) | Condominium | User explicitly asked |
| "Townhouse appreciation" | A (Residential) | Townhouse | User explicitly asked |
| "Commercial property trends" | C (Commercial) | None | No subtype needed |

## 🧪 Testing Strategy

### Test Cases
1. **Default behavior** - Residential query without subtype should default to Single Family
2. **Explicit condo** - "condos in X" should filter to Condominium subtype
3. **Explicit townhouse** - "townhomes in X" should filter to Townhouse subtype
4. **Mixed query** - User asking to compare subtypes should make multiple API calls
5. **Commercial** - Commercial queries should not apply subtype filter

### Test Script Updates
**File**: `src/scripts/test/test-analytics.py`

Add test cases:
```python
# Test default (Single Family)
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 5y

# Test explicit condo
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 5y --property-subtype "Condominium"

# Test explicit townhouse
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 5y --property-subtype "Townhouse"
```

## 📝 API Examples

### Get Single Family Appreciation (Default)
```bash
GET /api/analytics/appreciation?city=Palm+Desert&period=5y
# Automatically filters to propertySubType: "Single Family"
```

### Get Condo Appreciation
```bash
GET /api/analytics/appreciation?city=Palm+Desert&period=5y&propertySubType=Condominium
```

### Get Townhouse Appreciation
```bash
GET /api/analytics/appreciation?subdivision=indian-wells-country-club&period=3y&propertySubType=Townhouse
```

### Get All Residential (Override Default)
```bash
# Future enhancement: Allow "All" to include all subtypes
GET /api/analytics/appreciation?city=Palm+Desert&period=5y&propertySubType=All
```

## 🚀 Performance Optimizations

### MongoDB Indexes
The `propertySubType_closeDate` compound index provides:
- **Fast lookups** when filtering by subtype and date range
- **Sorted results** by close date without additional sort operation
- **Sparse index** to save space (only indexes docs with propertySubType)

### Query Performance Estimate
Without index:
```
Query: { city: "Palm Desert", propertySubType: "Single Family", closeDate: { $gte: ... } }
Scan: ~50,000 Palm Desert docs → filter subtype → filter date
Time: ~500ms
```

With compound index:
```
Query: Uses propertySubType_closeDate index
Scan: ~3,000 matching docs directly
Time: ~50ms (10x faster)
```

## ⚠️ Known Limitations

1. **Sparse Data** - Some subdivisions may have insufficient data when filtered by subtype
   - **Solution**: Show confidence warning when <20 sales for subtype

2. **Mixed-Use Subdivisions** - Some communities have both single-family and condos
   - **Solution**: Default to Single Family prevents mixing, users can request condos separately

3. **Data Quality** - Some MLS listings may have missing/incorrect propertySubType
   - **Solution**: Validation during seed process, fall back to propertyType if needed

## 🔮 Future Enhancements

1. **Multi-SubType Comparison**
   - Allow users to compare Single Family vs Condo appreciation side-by-side
   - API accepts array: `propertySubType=Single+Family,Condominium`

2. **SubType Distribution**
   - Show breakdown: "This subdivision has 70% single-family, 30% condos"

3. **Price Per SqFt by SubType**
   - More accurate $/sqft when comparing similar property types

4. **Rental Yield by SubType**
   - Condos typically have different rental yields than single-family

## ✅ Completion Criteria

- [x] ClosedSalesFilters interface updated
- [x] MongoDB query logic implemented
- [x] API route parameter handling added
- [x] Default logic for residential queries
- [x] AI tool definition updated
- [x] Tool execution handler updated
- [x] Database index created
- [x] Documentation completed
- [ ] Real data testing (waiting for fetch completion)
- [ ] User acceptance testing

## 📊 Success Metrics

Once implemented and tested with real data:
- ✅ Appreciation calculations separated by property subtype
- ✅ No more mixing condos with single-family homes
- ✅ More accurate market insights
- ✅ Better user trust in data quality
- ✅ Faster queries with compound index

---

**Status**: 🟢 IMPLEMENTATION COMPLETE
**Next Step**: Test with real data once fetch completes (ETA: 3-4 hours)
