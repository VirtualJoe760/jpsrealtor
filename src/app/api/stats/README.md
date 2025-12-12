# Stats API Documentation

Comprehensive statistics API for real estate data, market indicators, and analytics.

## Table of Contents
- [Overview](#overview)
- [Available Endpoints](#available-endpoints)
- [Property Type Codes](#property-type-codes)
- [Query Parameters](#query-parameters)
- [Response Format](#response-format)
- [Examples](#examples)
- [Caching Strategy](#caching-strategy)

---

## Overview

The Stats API provides pre-calculated and real-time statistics for various aspects of the real estate platform:

- **Listing Statistics**: Property counts, pricing, and market metrics
- **Geographic Statistics**: City, county, and region-level data
- **Market Statistics**: Mortgage rates, economic indicators
- **User Statistics**: Activity, engagement, preferences (future)

---

## Available Endpoints

### Index
```
GET /api/stats
```
Returns a list of all available stats endpoints with descriptions.

### California Statewide Statistics
```
GET /api/stats/california?propertyType={A|B|C|D}
```
Returns California-wide statistics, optionally filtered by property type.

**Query Parameters:**
- `propertyType` (optional): Filter by property type (A, B, C, or D)

**Response:**
```json
{
  "count": 12500,
  "medianPrice": 675000,
  "avgPrice": 720500,
  "minPrice": 125000,
  "maxPrice": 15000000,
  "propertyType": "A",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

### Market Statistics
```
GET /api/stats/market
```
Returns current market indicators including mortgage rates and economic data.

**Response:**
```json
{
  "success": true,
  "data": {
    "mortgageRates": {
      "current": {
        "thirtyYear": 6.875,
        "fifteenYear": 6.125,
        "fiveOneArm": 6.25
      },
      "historical": [...]
    },
    "economicIndicators": {
      "inflation": 3.2,
      "unemployment": 4.1,
      ...
    }
  }
}
```

### Property Type Statistics (Future)
```
GET /api/stats/property-types
```
Returns comparative statistics across all property types.

### Geographic Statistics (Future)
```
GET /api/stats/geographic/{city|county|region}/{name}?propertyType={A|B|C|D}
```
Returns statistics for a specific geographic area.

---

## Property Type Codes

| Code | Type | Description |
|------|------|-------------|
| `A` | Residential Sale | Single-family homes, condos for sale |
| `B` | Rental | Properties available for rent |
| `C` | Multi-Family | Apartment buildings, duplexes, etc. |
| `D` | Land | Vacant land, lots |

---

## Query Parameters

### Common Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyType` | string | No | Filter by property type (A, B, C, D) |
| `city` | string | No | Filter by city name |
| `county` | string | No | Filter by county name |
| `minPrice` | number | No | Minimum price filter |
| `maxPrice` | number | No | Maximum price filter |

### Statistics-Specific Parameters

| Parameter | Type | Required | Description | Endpoints |
|-----------|------|----------|-------------|-----------|
| `includeHistory` | boolean | No | Include historical data | market |
| `period` | string | No | Time period (1m, 3m, 6m, 1y) | market, california |

---

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "metadata": {
    "cached": true,
    "cacheExpiry": "2025-12-08T11:30:00.000Z",
    "generatedAt": "2025-12-08T10:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

---

## Examples

### Get all residential sale statistics for California
```bash
GET /api/stats/california?propertyType=A
```

### Get rental property statistics
```bash
GET /api/stats/california?propertyType=B
```

### Get land listing statistics
```bash
GET /api/stats/california?propertyType=D
```

### Get current market statistics
```bash
GET /api/stats/market
```

### Compare all property types
```bash
GET /api/stats/property-types
```

---

## Caching Strategy

### Cache Duration by Endpoint

| Endpoint | Cache Duration | Revalidate |
|----------|---------------|------------|
| `/api/stats/california` (no filter) | 1 hour | 2 hours |
| `/api/stats/california` (filtered) | 10 minutes | 20 minutes |
| `/api/stats/market` | 15 minutes | 30 minutes |
| `/api/stats/property-types` | 30 minutes | 1 hour |
| `/api/stats/geographic/*` | 30 minutes | 1 hour |

### Cache Headers

All responses include appropriate cache headers:
```
Cache-Control: public, s-maxage={duration}, stale-while-revalidate={revalidate}
```

---

## Performance Considerations

1. **Pre-calculated Stats**: Statewide stats are pre-calculated and stored in MongoDB for instant retrieval
2. **On-Demand Calculation**: Filtered stats are calculated on-demand with aggressive caching
3. **Database Indexes**: All stat queries use optimized indexes for fast aggregation
4. **Edge Caching**: CloudFlare caches responses at the edge for global performance

---

## Future Enhancements

- [ ] Historical trend data for all stat types
- [ ] Comparative statistics (YoY, MoM)
- [ ] User-specific statistics and analytics
- [ ] Real-time WebSocket updates for market stats
- [ ] ML-powered predictive statistics
- [ ] Export capabilities (CSV, JSON, PDF)
- [ ] GraphQL API for flexible querying
- [ ] Subdivision-level statistics
- [ ] School district statistics
- [ ] Neighborhood statistics

---

## Support

For API support or questions, please contact the development team or file an issue in the project repository.

**Last Updated**: December 8, 2025
**API Version**: 1.0.0
