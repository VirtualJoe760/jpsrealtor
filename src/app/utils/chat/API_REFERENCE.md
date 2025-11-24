# Chat API & Database Reference

**Last Updated**: November 22, 2025
**Purpose**: Quick reference for MongoDB collections and API endpoints used in chat functionality

---

## MongoDB Collections

### 1. `cities` Collection

**Location**: `jpsrealtor.cities`

**Document Structure**:
```javascript
{
  _id: ObjectId("..."),
  slug: "palm-desert",              // URL-friendly identifier
  name: "Palm Desert",               // Display name
  normalizedName: "palm desert",     // Lowercase for matching
  county: "Riverside",
  region: "Riverside County",
  coordinates: { type: "Point", coordinates: [lng, lat] },
  subdivisionCount: 42,              // Number of subdivisions in this city
  listingCount: 1234,                // Total active listings
  avgPrice: 850000,
  medianPrice: 750000,
  priceRange: { min: 200000, max: 5000000 },
  propertyTypes: { ... },
  features: [],
  keywords: [],
  mlssources: [],
  createdAt: ISODate("..."),
  lastUpdated: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**Query Examples**:
```javascript
// Find city by slug
db.cities.findOne({ slug: "palm-desert" })

// Find city by name (case-insensitive)
db.cities.findOne({ normalizedName: "palm desert" })

// Get all cities in Riverside County
db.cities.find({ county: "Riverside" })

// Get cities with listings
db.cities.find({ listingCount: { $gt: 0 } })
```

---

### 2. `subdivisions` Collection

**Location**: `jpsrealtor.subdivisions`

**Document Structure** (assumed based on cities structure):
```javascript
{
  _id: ObjectId("..."),
  slug: "palm-desert-country-club",  // URL-friendly identifier
  name: "Palm Desert Country Club",  // Display name
  normalizedName: "palm desert country club",
  city: "Palm Desert",                // City name
  citySlug: "palm-desert",           // City slug for lookups
  county: "Riverside",
  region: "Coachella Valley",
  coordinates: { type: "Point", coordinates: [lng, lat] },
  listingCount: 45,                   // Active listings in subdivision
  avgPrice: 625000,
  medianPrice: 585000,
  priceRange: { min: 450000, max: 950000 },
  hoaInfo: {
    hasHOA: true,
    avgFee: 350,
    feeRange: { min: 250, max: 500 }
  },
  propertyTypes: { ... },
  amenities: ["Golf Course", "Tennis Courts", "Pool"],
  features: [],
  keywords: [],
  createdAt: ISODate("..."),
  lastUpdated: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**Query Examples**:
```javascript
// Find subdivision by slug
db.subdivisions.findOne({ slug: "palm-desert-country-club" })

// Find all subdivisions in a city (by city slug)
db.subdivisions.find({ citySlug: "palm-desert" })

// Find all subdivisions in a city (by city name)
db.subdivisions.find({ city: "Palm Desert" })

// Find subdivisions with listings
db.subdivisions.find({
  citySlug: "palm-desert",
  listingCount: { $gt: 0 }
})

// Search by name (case-insensitive)
db.subdivisions.find({
  normalizedName: { $regex: "country club", $options: "i" }
})
```

---

### 3. `listings` Collection

**Location**: `jpsrealtor.listings`

**Document Structure**:
```javascript
{
  _id: ObjectId("..."),
  ListingKey: "...",
  StandardStatus: "Active",
  City: "Palm Desert",
  SubdivisionName: "Palm Desert Country Club",
  StreetAddress: "123 Main St",
  PostalCode: "92260",
  Latitude: 33.7222,
  Longitude: -116.3750,
  ListPrice: 625000,
  BedroomsTotal: 3,
  BathroomsTotalInteger: 2,
  LivingArea: 2100,
  PropertyType: "Residential",
  PropertySubType: "Single Family Residence",
  // ... many more MLS fields
}
```

**Query Examples**:
```javascript
// Find listings in a city
db.listings.find({ City: "Palm Desert", StandardStatus: "Active" })

// Find listings in a subdivision
db.listings.find({
  SubdivisionName: "Palm Desert Country Club",
  StandardStatus: "Active"
})

// Find listings with filters
db.listings.find({
  City: "Palm Desert",
  StandardStatus: "Active",
  ListPrice: { $lte: 500000 },
  BedroomsTotal: { $gte: 3 }
})
```

---

## Chat API Endpoints

### 1. `/api/chat/stream` - Main Chat Endpoint

**Method**: POST
**Purpose**: Process chat messages with Llama 4 Scout function calling

**Request Body**:
```typescript
{
  messages: [
    { role: "user", content: "show me homes in palm desert" }
  ],
  userId: "user-123",
  userTier: "free" | "premium"
}
```

**Response**:
```typescript
{
  response: "Showing 45 homes in Palm Desert...",
  listings: [...],  // Array of Listing objects
  metadata: {
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    processingTime: 3500,
    iterations: 3,
    functionCalls: [
      { function: "matchLocation", arguments: {...} },
      { function: "searchListings", arguments: {...} }
    ],
    performanceTimings: {
      total: 3500,
      breakdown: [...]
    }
  }
}
```

---

### 2. Chat Function Calls (Groq Native)

These are the available functions that Llama 4 Scout can call:

#### `matchLocation`
**Purpose**: Find city or subdivision by name
```typescript
{
  name: "matchLocation",
  parameters: {
    query: "palm desert"
  }
}
```

#### `searchListings`
**Purpose**: Search for listings with filters
```typescript
{
  name: "searchListings",
  parameters: {
    citySlug: "palm-desert",
    subdivisionSlug?: "palm-desert-country-club",
    minPrice?: 400000,
    maxPrice?: 800000,
    bedrooms?: 3,
    bathrooms?: 2,
    propertyType?: "Single Family Residence"
  }
}
```

#### `getSubdivisionListings`
**Purpose**: Get all listings in a subdivision
```typescript
{
  name: "getSubdivisionListings",
  parameters: {
    citySlug: "palm-desert",
    subdivisionSlug: "palm-desert-country-club"
  }
}
```

#### `getCityStats`
**Purpose**: Get statistics for a city
```typescript
{
  name: "getCityStats",
  parameters: {
    citySlug: "palm-desert"
  }
}
```

#### `getSubdivisionStats`
**Purpose**: Get statistics for a subdivision
```typescript
{
  name: "getSubdivisionStats",
  parameters: {
    citySlug: "palm-desert",
    subdivisionSlug: "palm-desert-country-club"
  }
}
```

#### `getCitySubdivisions`
**Purpose**: List all subdivisions in a city
```typescript
{
  name: "getCitySubdivisions",
  parameters: {
    citySlug: "palm-desert"
  }
}
```

#### `getCityHOA`
**Purpose**: Get HOA information for a city
```typescript
{
  name: "getCityHOA",
  parameters: {
    citySlug: "palm-desert"
  }
}
```

---

## Key Field Mappings

### City/Subdivision Identification

| Use Case | Field to Query | Collection |
|----------|---------------|------------|
| URL routing | `slug` | cities/subdivisions |
| Display name | `name` | cities/subdivisions |
| Search/matching | `normalizedName` | cities/subdivisions |
| Filtering by city | `citySlug` | subdivisions |

### Common Query Patterns

```javascript
// 1. Get city by slug (fastest)
db.cities.findOne({ slug: "palm-desert" })

// 2. Get subdivisions for a city
db.subdivisions.find({ citySlug: "palm-desert" })

// 3. Get subdivision by slug
db.subdivisions.findOne({
  citySlug: "palm-desert",
  slug: "palm-desert-country-club"
})

// 4. Get listings for subdivision
db.listings.find({
  City: "Palm Desert",
  SubdivisionName: "Palm Desert Country Club",
  StandardStatus: "Active"
})
```

---

## Testing Queries

### Test Palm Desert Subdivisions

```bash
# 1. Get Palm Desert city info
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what communities are in palm desert"}],
    "userId": "test",
    "userTier": "free"
  }'

# 2. Get specific subdivision listings
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "show me homes in palm desert country club"}],
    "userId": "test",
    "userTier": "free"
  }'

# 3. Get subdivision stats
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "what are prices like in palm desert country club"}],
    "userId": "test",
    "userTier": "free"
  }'
```

---

## Map View Integration

The chat widget integrates with the map view through the `listings` array in metadata:

```typescript
// In chat response
{
  listings: [
    {
      ListingKey: "...",
      Latitude: 33.7222,
      Longitude: -116.3750,
      ListPrice: 625000,
      // ... other listing data
    }
  ]
}

// Map bounds calculated by mapUtils.ts
import { calculateListingsBounds } from "@/app/utils/chat/mapUtils";

const bounds = calculateListingsBounds(listings);
// Returns: { north, south, east, west }

// Used in IntegratedChatWidget to:
// 1. Display listings on map
// 2. Zoom map to show all listings
// 3. Enable "View on Map" button
```

---

## Important Notes

1. **Always use `slug` fields for querying** - they're indexed and faster
2. **Use `normalizedName` for search/matching** - handles case-insensitive matching
3. **Check `listingCount` before showing subdivisions** - filter out empty ones
4. **City-Subdivision relationship**: Use `citySlug` field in subdivisions to link to cities
5. **StandardStatus**: Always filter listings by `StandardStatus: "Active"` for current inventory

---

**File Location**: `src/app/utils/chat/API_REFERENCE.md`
**Quick Access**: Reference this file when working with chat functionality
