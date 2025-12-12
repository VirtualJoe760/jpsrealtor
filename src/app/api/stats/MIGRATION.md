# Stats API Migration Guide

## Overview

The Stats API has been refactored into a well-organized structure under `/api/stats/` with clear documentation, consistent response formats, and support for property type filtering.

---

## What Changed

### Old Structure
```
/api/california-stats       → California statewide stats
/api/market-stats           → Market statistics
```

### New Structure
```
/api/stats                  → Index & documentation
/api/stats/california       → California statewide stats (with property type filtering)
/api/stats/market           → Market statistics
/api/stats/property-types   → Comparative stats across property types (NEW)
```

---

## Breaking Changes

### ❌ Old Endpoints (Deprecated)
```
GET /api/california-stats
GET /api/market-stats
```

### ✅ New Endpoints (Use These)
```
GET /api/stats/california?propertyType={A|B|C|D}
GET /api/stats/market
GET /api/stats/property-types
```

---

## Migration Steps

### 1. Update California Stats Calls

**Before:**
```typescript
const response = await fetch('/api/california-stats');
const stats = await response.json();
```

**After:**
```typescript
const response = await fetch('/api/stats/california');
const { success, data } = await response.json();
const stats = data;
```

**With Property Type Filter:**
```typescript
// Residential sale properties only
const response = await fetch('/api/stats/california?propertyType=A');
const { success, data } = await response.json();

// Land listings only
const response = await fetch('/api/stats/california?propertyType=D');
const { success, data } = await response.json();
```

### 2. Update Market Stats Calls

**Before:**
```typescript
const response = await fetch('/api/market-stats');
const { success, data } = await response.json();
```

**After:**
```typescript
const response = await fetch('/api/stats/market');
const { success, data } = await response.json();
```

*Note: Response format is the same, just the URL changed.*

### 3. New Property Type Comparison

Get comparative statistics across all property types:

```typescript
const response = await fetch('/api/stats/property-types');
const { success, data } = await response.json();

// Access individual type stats
console.log(data.propertyTypes.residential); // Type A
console.log(data.propertyTypes.rental);      // Type B
console.log(data.propertyTypes.multiFamily); // Type C
console.log(data.propertyTypes.land);        // Type D

// Or iterate over comparison array
data.comparison.forEach(type => {
  console.log(`${type.name}: ${type.count} listings`);
});
```

---

## Response Format Changes

### California Stats

**Old Format:**
```json
{
  "count": 12500,
  "medianPrice": 675000,
  "avgPrice": 720500,
  "minPrice": 125000,
  "maxPrice": 15000000
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "count": 12500,
    "medianPrice": 675000,
    "avgPrice": 720500,
    "minPrice": 125000,
    "maxPrice": 15000000,
    "propertyType": "A",
    "lastUpdated": "2025-12-08T10:30:00.000Z"
  },
  "metadata": {
    "cached": true,
    "source": "pre-calculated",
    "generatedAt": "2025-12-08T10:30:00.000Z"
  }
}
```

### Market Stats

**Format unchanged** - still wrapped in `{ success, data }` structure.

---

## Code Examples

### React Component Migration

**Before:**
```typescript
function CaliforniaStatsWidget() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/california-stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h3>California Market</h3>
      <p>{stats?.count} listings</p>
      <p>Median: ${stats?.medianPrice?.toLocaleString()}</p>
    </div>
  );
}
```

**After:**
```typescript
function CaliforniaStatsWidget({ propertyType = null }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const url = propertyType
      ? `/api/stats/california?propertyType=${propertyType}`
      : '/api/stats/california';

    fetch(url)
      .then(res => res.json())
      .then(({ success, data }) => {
        if (success) setStats(data);
      });
  }, [propertyType]);

  return (
    <div>
      <h3>
        {stats?.propertyType
          ? `${getPropertyTypeName(stats.propertyType)} Listings`
          : 'California Market'}
      </h3>
      <p>{stats?.count} listings</p>
      <p>Median: ${stats?.medianPrice?.toLocaleString()}</p>
      <p className="text-xs text-gray-500">
        Updated: {new Date(stats?.lastUpdated).toLocaleDateString()}
      </p>
    </div>
  );
}
```

### Property Type Selector

**New Feature:**
```typescript
function PropertyTypeStats() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const url = selectedType
      ? `/api/stats/california?propertyType=${selectedType}`
      : '/api/stats/california';

    fetch(url)
      .then(res => res.json())
      .then(({ success, data }) => {
        if (success) setStats(data);
      });
  }, [selectedType]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSelectedType(null)}>All</button>
        <button onClick={() => setSelectedType('A')}>Residential</button>
        <button onClick={() => setSelectedType('B')}>Rental</button>
        <button onClick={() => setSelectedType('C')}>Multi-Family</button>
        <button onClick={() => setSelectedType('D')}>Land</button>
      </div>

      <div className="stats-display">
        {/* Stats display */}
      </div>
    </div>
  );
}
```

---

## Property Type Codes

| Code | Name | Description |
|------|------|-------------|
| `A` | Residential Sale | Single-family homes, condos for sale |
| `B` | Rental | Properties available for rent |
| `C` | Multi-Family | Apartment buildings, duplexes |
| `D` | Land | Vacant land, lots |

---

## Error Handling

All endpoints now return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Example Error Handling:**
```typescript
async function fetchStats(propertyType?: string) {
  try {
    const url = propertyType
      ? `/api/stats/california?propertyType=${propertyType}`
      : '/api/stats/california';

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      console.error(`Stats API error [${result.code}]:`, result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return null;
  }
}
```

---

## Backward Compatibility

### Keeping Old Endpoints

The old endpoints `/api/california-stats` and `/api/market-stats` are **still functional** but marked as deprecated. They will continue to work to ensure backward compatibility, but new code should use the new endpoints.

To completely remove the old endpoints:
1. Update all code to use new endpoints
2. Test thoroughly
3. Delete old endpoint files:
   - `src/app/api/california-stats/route.ts`
   - `src/app/api/market-stats/route.ts`

---

## Testing Checklist

- [ ] Test `/api/stats` index endpoint
- [ ] Test `/api/stats/california` without filters
- [ ] Test `/api/stats/california?propertyType=A`
- [ ] Test `/api/stats/california?propertyType=B`
- [ ] Test `/api/stats/california?propertyType=C`
- [ ] Test `/api/stats/california?propertyType=D`
- [ ] Test `/api/stats/market`
- [ ] Test `/api/stats/property-types`
- [ ] Test invalid property type returns 400 error
- [ ] Verify caching headers are correct
- [ ] Check response times are acceptable
- [ ] Update all frontend components
- [ ] Update any documentation
- [ ] Test error scenarios

---

## Performance Improvements

The new structure includes:

1. **Aggressive Caching**:
   - Unfiltered stats: 1 hour cache
   - Filtered stats: 10 minute cache
   - Market stats: 15 minute cache

2. **Optimized Queries**:
   - Uses MongoDB aggregation pipeline
   - Single query for property type comparison
   - Pre-calculated stats for common queries

3. **Better Error Handling**:
   - Graceful fallbacks
   - Detailed error codes
   - Comprehensive logging

---

## Need Help?

- Check the [README.md](./README.md) for full API documentation
- Review example responses in this migration guide
- Contact the development team for support

**Migration Date**: December 8, 2025
**Deadline for Migration**: TBD (old endpoints will be deprecated but not removed immediately)
