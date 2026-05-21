# Database Models & Collections
**MongoDB Schema Reference**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

JPSRealtor.com uses **MongoDB** (DigitalOcean Managed) with the following architecture:
- **Database:** `jpsrealtor`
- **Location:** NYC3 (New York)
- **Storage:** 80GB SSD
- **RAM:** 4GB
- **Replica Set:** 3 nodes
- **Total Documents:** ~115,000
- **Total Size:** ~8GB

---

## 📦 COLLECTIONS

### MLS Listings (Active)

#### 1. **listings** (GPS MLS - 11,592 active)
```typescript
{
  _id: ObjectId,
  listingKey: string,           // Unique MLS identifier
  listingId: string,
  mlsStatus: string,
  standardStatus: "Active" | "Pending" | "Sold" | "Expired",

  // Property Details
  propertyType: "A" | "B" | "C",  // A=Sale, B=Rental, C=Multi-family
  propertySubType: string,         // Single Family, Condo, Townhouse, etc.

  // Location
  address: string,
  unparsedAddress: string,
  city: string,
  stateOrProvince: string,
  postalCode: string,
  latitude: number,
  longitude: number,

  // Pricing
  listPrice: number,
  originalListPrice: number,
  priceChangeTimestamp: Date,

  // Size
  bedsTotal: number,
  bathroomsTotalInteger: number,
  bathrooms

Full: number,
  bathroomsHalf: number,
  livingArea: number,            // Sqft
  lotSizeSqft: number,
  yearBuilt: number,

  // Amenities
  poolYn: boolean,
  spaYn: boolean,
  viewYn: boolean,
  garageSpaces: number,

  // HOA
  associationYN: boolean,
  associationFee: number,
  subdivisionName: string,

  // Metadata
  listDate: Date,
  modificationTimestamp: Date,
  onMarketDate: Date,
  daysOnMarket: number,

  // Generated
  slugAddress: string,           // URL-friendly address
  primaryPhotoUrl: string,

  // Indexes (see below)
}
```

**Indexes:**
```typescript
{ latitude: 1, longitude: 1, standardStatus: 1, propertyType: 1 }  // Geospatial
{ standardStatus: 1, listPrice: 1 }                                 // Price search
{ city: 1, standardStatus: 1, listPrice: 1 }                        // City search
{ subdivisionName: 1, standardStatus: 1 }                           // Subdivision
{ slugAddress: 1 }                                                  // Unique
{ listingKey: 1 }                                                   // Unique
```

#### 2. **crmlsListings** (CRMLS - 20,406 active)
Same schema as `listings`, but from CRMLS MLS.

### MLS Listings (Closed)

#### 3. **gpsClosedListings** (11,592 sold/expired)
Same schema as `listings`, for historical data.

#### 4. **crmlsClosedListings** (30,409 sold/expired)
Same schema as `listings`, for historical data.

---

### Photos

#### 5. **photos** (~40,000 cached)
```typescript
{
  _id: ObjectId,
  listingId: string,             // Links to listing
  primary: boolean,
  Order: number,                 // Display order

  // Available sizes (Spark API CDN URLs)
  uriThumb: string,
  uri300: string,
  uri640: string,
  uri800: string,
  uri1024: string,
  uri1280: string,
  uri1600: string,
  uri2048: string,
  uriLarge: string,

  // Metadata
  caption: string,
  modificationTimestamp: Date
}
```

**Indexes:**
```typescript
{ listingId: 1, primary: -1, Order: 1 }  // Compound for primary photo lookup
```

---

### Users & Authentication (NextAuth)

#### 6. **users** (~500)
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,                 // Unique
  emailVerified: Date,
  image: string,                 // Profile photo URL

  // Role-based access
  role: "user" | "investor" | "agent" | "admin",

  // User preferences (future)
  preferences: {
    theme: "blackspace" | "lightgradient",
    savedSearches: Array,
    favoriteSubdivisions: string[]
  },

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

#### 7. **sessions** (NextAuth managed)
```typescript
{
  _id: ObjectId,
  sessionToken: string,          // Unique JWT token
  userId: ObjectId,              // Ref to users
  expires: Date
}
```

#### 8. **accounts** (OAuth providers)
```typescript
{
  _id: ObjectId,
  userId: ObjectId,              // Ref to users
  type: "oauth",
  provider: "google" | "facebook",
  providerAccountId: string,
  access_token: string,
  refresh_token: string,
  expires_at: number,
  token_type: string,
  scope: string,
  id_token: string
}
```

#### 9. **verification_tokens** (Future - email verification)
```typescript
{
  identifier: string,            // Email
  token: string,
  expires: Date
}
```

---

### Content

#### 10. **cities** (~50)
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,                  // URL-friendly
  county: string,
  state: string,

  // Coordinates
  latitude: number,
  longitude: number,
  bounds: {
    north: number,
    south: number,
    east: number,
    west: number
  },

  // Statistics (cached)
  stats: {
    totalListings: number,
    avgPrice: number,
    priceRange: { min: number, max: number },
    avgSqft: number,
    mostCommonBeds: number
  },

  // Content
  description: string,
  featuredImage: string,

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

#### 11. **subdivisions** (~500)
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,
  city: string,
  citySlug: string,

  // HOA
  hasHOA: boolean,
  hoaFee: number,

  // Location
  latitude: number,
  longitude: number,
  bounds: { north, south, east, west },

  // Statistics
  stats: {
    totalListings: number,
    avgPrice: number,
    avgSqft: number
  },

  // Content
  description: string,
  amenities: string[],
  featuredImages: string[],

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

#### 12. **schools** (~200)
```typescript
{
  _id: ObjectId,
  name: string,
  type: "Elementary" | "Middle" | "High",
  district: string,

  // Location
  address: string,
  city: string,
  latitude: number,
  longitude: number,

  // Ratings
  rating: number,               // 1-10
  testScores: number,

  // Links
  greatSchoolsUrl: string,
  website: string
}
```

---

### User Data

#### 13. **chatMessages** (~10,000)
```typescript
{
  _id: ObjectId,
  sessionId: string,            // Anonymous or user ID
  userId: ObjectId,             // Ref to users (if authenticated)

  role: "user" | "assistant" | "system",
  content: string,

  // Tool calls (if applicable)
  toolCalls: [{
    name: string,
    arguments: object,
    result: object
  }],

  timestamp: Date
}
```

#### 14. **savedChats** (~2,000)
```typescript
{
  _id: ObjectId,
  sessionId: string,
  userId: ObjectId,
  title: string,                // Auto-generated or user-defined

  messages: ObjectId[],         // Refs to chatMessages

  createdAt: Date,
  updatedAt: Date,
  lastAccessed: Date
}
```

#### 15. **swipes** (User swipe history)
```typescript
{
  _id: ObjectId,
  listingKey: string,
  direction: "left" | "right",

  // User identification
  userId: ObjectId,             // If authenticated
  sessionId: string,            // Anonymous session UUID

  // Listing data (cached for analytics)
  listingData: {
    subdivision: string,
    city: string,
    propertyType: string,
    listPrice: number
  },

  timestamp: Date,
  expiresAt: Date              // TTL index: 30 min for dislikes
}
```

**Indexes:**
```typescript
{ userId: 1, listingKey: 1 }              // User swipe lookup
{ sessionId: 1, listingKey: 1 }           // Anonymous swipe lookup
{ expiresAt: 1 }                          // TTL index (auto-delete expired)
```

---

## 🔍 COMMON QUERIES

### Find Active Listings in Viewport
```typescript
db.listings.find({
  latitude: { $gte: south, $lte: north },
  longitude: { $gte: west, $lte: east },
  standardStatus: "Active",
  propertyType: "A",
  listPrice: { $gte: 300000, $lte: 800000 }
}).limit(1000);
```

### Get User's Swipe History
```typescript
db.swipes.find({
  userId: ObjectId("..."),
  direction: "right"
}).sort({ timestamp: -1 });
```

### Aggregate Top Subdivisions
```typescript
db.swipes.aggregate([
  { $match: { userId: ObjectId("..."), direction: "right" } },
  { $group: { _id: "$listingData.subdivision", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

---

## 📊 DATABASE STATISTICS

```
Total Documents: ~115,000
  - Listings (active): 32,000
  - Listings (closed): 42,000
  - Photos: 40,000
  - Users: 500
  - Cities: 50
  - Subdivisions: 500
  - Other: ~1,000

Total Size: ~8GB
  - Listings: ~5GB
  - Photos: ~2GB
  - Other: ~1GB

Indexes: 25+
Queries/day: ~50,000
Avg query time: <50ms
```

---

## 📚 RELATED DOCUMENTATION

- [MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)
- [SWIPE_SYSTEM.md](./SWIPE_SYSTEM.md) - Swipes collection usage
- [AUTHENTICATION.md](./AUTHENTICATION.md) - NextAuth collections

---

**Last Updated:** January 29, 2025
