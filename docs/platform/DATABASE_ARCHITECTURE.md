# Database Architecture Documentation

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor
**Database:** MongoDB Atlas 6.x (DigitalOcean Managed)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Overview](#database-overview)
3. [Collections Schema](#collections-schema)
4. [Indexing Strategy](#indexing-strategy)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Performance Optimization](#performance-optimization)
7. [Backup & Recovery](#backup--recovery)
8. [Data Integrity](#data-integrity)

---

## Executive Summary

The ChatRealty ecosystem uses a **single shared MongoDB Atlas database** as the authoritative data store. Both PayloadCMS and the Next.js frontend access the same database instance, enabling:

- **Performance**: Direct MongoDB queries for listing searches (bypassing CMS overhead)
- **Consistency**: Single source of truth for all data
- **Flexibility**: PayloadCMS manages some collections, frontend manages others
- **Scalability**: MongoDB Atlas provides auto-scaling, replication, backups

**Database Name**: `jpsrealtor`

**Connection String**: `# Add your MongoDB connection string/jpsrealtor?retryWrites=true&w=majority`

**Hosting**: DigitalOcean MongoDB Atlas Managed Database

---

## Database Overview

### Collection Ownership Model

**PayloadCMS-Managed Collections** (content, users, metadata):
- `users` - User accounts and authentication
- `cities` - City entities
- `neighborhoods` - Subdivision/neighborhood entities
- `schools` - School data
- `blogPosts` - Blog content
- `contacts` - Contact form submissions
- `media` - File uploads
- `payload-preferences` - Payload internal state
- `payload-migrations` - Payload schema migrations

**Frontend-Managed Collections** (performance-critical data):
- `listings` - GPS MLS listings (11,592 active)
- `crmlsListings` - CRMLS MLS listings (20,406 active)
- `chatMessages` - AI chat history
- `savedChats` - Persisted conversations
- `swipeReviewSessions` - Swipe mode analytics
- `searchInsights` - Search analytics

---

## Collections Schema

### 1. Users Collection (PayloadCMS)

**Document Count**: ~500

**Schema**:
```typescript
{
  _id: ObjectId,
  email: string (unique, indexed),
  password: string (bcrypt hashed),
  role: 'admin' | 'agent' | 'broker' | 'client' | 'investor' | 'provider' | 'host',

  // Stripe subscription
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  subscriptionTier: 'none' | 'basic' | 'pro' | 'enterprise',
  subscriptionStatus: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled',
  subscriptionCurrentPeriodEnd: number (Unix timestamp),
  subscriptionCancelAtPeriodEnd: boolean,

  // Profile
  profile: {
    firstName: string,
    lastName: string,
    company: string,
    phone: string,
    bio: string
  },

  // OAuth (future)
  oauthProvider: 'google' | 'facebook' | null,
  oauthId: string,

  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**:
- `email` (unique)
- `role`
- `stripeCustomerId`
- `createdAt` (descending)

---

### 2. Listings Collection (GPS MLS)

**Document Count**: 11,592 active listings

**Schema** (simplified):
```typescript
{
  _id: ObjectId,
  ListingId: string (unique, indexed), // e.g., "GPS123456"
  ListingKey: string (unique),

  // Address
  UnparsedAddress: string,
  City: string (indexed),
  StateOrProvince: string,
  PostalCode: string,
  County: string,
  SubdivisionName: string (indexed),

  // Location
  Latitude: number (indexed),
  Longitude: number (indexed),
  location: { // GeoJSON for geo queries
    type: "Point",
    coordinates: [longitude, latitude]
  },

  // Price
  ListPrice: number (indexed),
  OriginalListPrice: number,
  PricePerSquareFoot: number,

  // Property details
  BedroomsTotal: number (indexed),
  BathroomsTotalInteger: number (indexed),
  LivingArea: number,
  LotSizeSquareFeet: number,
  YearBuilt: number,
  PropertyType: string, // e.g., "Residential"
  PropertySubType: string, // e.g., "Single Family Residence"

  // Status
  ListingStatus: string (indexed), // "Active", "Pending", "Closed"
  StandardStatus: string,
  DaysOnMarket: number,

  // Media
  photos: string[], // Array of Cloudinary URLs
  photoCount: number,

  // Features
  PoolFeatures: string[],
  Appliances: string[],
  ArchitecturalStyle: string[],
  Heating: string[],
  Cooling: string[],

  // Listing details
  PublicRemarks: string,
  AgentName: string,
  AgentPhone: string,
  BrokerageName: string,

  // Timestamps
  ListingContractDate: ISODate,
  OnMarketDate: ISODate,
  ModificationTimestamp: ISODate,

  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**:
- `ListingId` (unique)
- `City`
- `SubdivisionName`
- `ListingStatus`
- `ListPrice`
- `BedroomsTotal`
- `BathroomsTotalInteger`
- `location` (2dsphere for geo queries)
- `ModificationTimestamp` (descending)

**Sample Query**:
```javascript
db.listings.find({
  City: "Palm Desert",
  ListingStatus: "Active",
  ListPrice: { $gte: 300000, $lte: 500000 },
  BedroomsTotal: { $gte: 3 }
}).sort({ ListPrice: -1 }).limit(20)
```

---

### 3. CRMLS Listings Collection

**Document Count**: 20,406 active listings

**Schema**: Nearly identical to GPS listings, with CRMLS-specific fields.

**Key Difference**: `MLSSource: "CRMLS"` field to distinguish from GPS.

---

### 4. Cities Collection (PayloadCMS)

**Document Count**: ~50

**Schema**:
```typescript
{
  _id: ObjectId,
  name: string, // e.g., "Palm Desert"
  slug: string (unique, indexed), // e.g., "palm-desert"
  state: string, // "CA"
  county: string, // "Riverside"

  coordinates: {
    latitude: number,
    longitude: number
  },

  description: object, // Lexical rich text
  featured: boolean,
  population: number,
  medianHomePrice: number,

  metadata: {
    walkScore: number,
    transitScore: number,
    bikeScore: number
  },

  seoMetadata: {
    title: string,
    description: string,
    keywords: string[]
  },

  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**:
- `slug` (unique)
- `name`
- `featured`

---

### 5. Neighborhoods Collection (PayloadCMS)

**Document Count**: ~200

**Schema**:
```typescript
{
  _id: ObjectId,
  name: string, // e.g., "Palm Desert Country Club"
  slug: string (unique, indexed), // e.g., "palm-desert-country-club"
  city: ObjectId (ref: cities, indexed),

  description: object, // Lexical rich text
  featured: boolean,

  coordinates: {
    latitude: number,
    longitude: number
  },

  boundary: object, // GeoJSON Polygon

  statistics: {
    activeListings: number,
    medianPrice: number,
    averageDaysOnMarket: number,
    pricePerSqft: number
  },

  amenities: string[], // ["Golf Course", "Pool", "Tennis"]
  schools: ObjectId[] (ref: schools),
  images: ObjectId[] (ref: media),

  seoMetadata: {
    title: string,
    description: string,
    keywords: string[]
  },

  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**:
- `slug` (unique)
- `city`
- `featured`
- `name`

---

### 6. Chat Messages Collection

**Document Count**: ~10,000+

**Schema**:
```typescript
{
  _id: ObjectId,
  conversationId: string (indexed), // UUID
  userId: string (indexed), // User ID

  role: 'user' | 'assistant',
  content: string,

  // Metadata
  listingIds: string[], // Listing IDs referenced in message
  subdivisionSlug: string,
  cityId: string,

  timestamp: ISODate (indexed),

  // AI metadata
  model: string, // e.g., "openai/gpt-oss-120b.1-70b-versatile"
  tokensUsed: number,
  responseTime: number, // milliseconds
}
```

**Indexes**:
- `conversationId`
- `userId`
- `timestamp` (descending)

---

### 7. Swipe Review Sessions Collection

**Document Count**: ~1,000+

**Schema**:
```typescript
{
  _id: ObjectId,
  batchId: string (unique, indexed), // UUID
  userId: string (indexed),

  subdivision: string,
  subdivisionSlug: string,
  cityId: string,

  visibleListings: string[], // Listing IDs
  currentIndex: number,

  swipeActions: [
    {
      listingId: string,
      action: 'left' | 'right', // left = not interested, right = favorite
      timestamp: ISODate
    }
  ],

  startedAt: ISODate,
  completedAt: ISODate,
  duration: number, // seconds

  source: 'chat' | 'map',

  analytics: {
    totalListings: number,
    listingsViewed: number,
    swipeLeftCount: number,
    swipeRightCount: number,
    conversionRate: number
  }
}
```

**Indexes**:
- `batchId` (unique)
- `userId`
- `startedAt` (descending)

---

## Indexing Strategy

### Compound Indexes

**Listings** (optimized for search queries):
```javascript
db.listings.createIndex({ City: 1, ListingStatus: 1, ListPrice: 1 })
db.listings.createIndex({ SubdivisionName: 1, ListingStatus: 1 })
db.listings.createIndex({ BedroomsTotal: 1, BathroomsTotalInteger: 1, ListPrice: 1 })
```

### Geospatial Indexes

**Listings** (for map searches):
```javascript
db.listings.createIndex({ location: "2dsphere" })
```

**Query Example**:
```javascript
db.listings.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-116.5453, 33.8303] },
      $maxDistance: 5000 // 5km radius
    }
  },
  ListingStatus: "Active"
})
```

### Text Indexes

**Listings** (for full-text search):
```javascript
db.listings.createIndex({
  UnparsedAddress: "text",
  PublicRemarks: "text",
  SubdivisionName: "text"
})
```

**Query Example**:
```javascript
db.listings.find({ $text: { $search: "pool mountain view" } })
```

---

## Data Flow Patterns

### Pattern 1: PayloadCMS Writes, Frontend Reads

**Use Case**: Cities, Neighborhoods, Schools

**Flow**:
```
Admin edits neighborhood in Payload UI
  ↓
PayloadCMS updates MongoDB
  ↓
Frontend queries MongoDB directly (no API call)
  ↓
Faster page loads
```

**Example**:
```typescript
// Frontend: Direct MongoDB query
import Neighborhood from '@/models/neighborhoods';

const neighborhood = await Neighborhood.findOne({ slug: 'palm-desert-country-club' })
  .populate('city')
  .lean();
```

---

### Pattern 2: Frontend Writes, Frontend Reads

**Use Case**: Chat messages, swipe sessions

**Flow**:
```
User sends chat message
  ↓
Frontend saves to MongoDB
  ↓
Frontend reads from MongoDB for history
```

**Example**:
```typescript
import ChatMessage from '@/models/chatMessages';

// Save message
await ChatMessage.create({
  conversationId: 'abc-123',
  userId: user.id,
  role: 'user',
  content: 'show me homes in palm desert',
  timestamp: new Date()
});

// Read messages
const messages = await ChatMessage.find({ conversationId: 'abc-123' })
  .sort({ timestamp: 1 })
  .lean();
```

---

### Pattern 3: External API Writes, Frontend Reads

**Use Case**: MLS listings (Spark API ingestion)

**Flow**:
```
Spark API (daily sync)
  ↓
Ingestion script updates MongoDB
  ↓
Frontend queries updated listings
```

---

## Performance Optimization

### 1. Lean Queries

**Always use `.lean()`** for read-only queries to avoid Mongoose overhead.

```typescript
// ❌ Slow (Mongoose documents with getters/setters)
const listings = await Listing.find({ City: 'Palm Desert' });

// ✅ Fast (plain JavaScript objects)
const listings = await Listing.find({ City: 'Palm Desert' }).lean();
```

**Performance Gain**: 30-50% faster

---

### 2. Projection

**Only fetch fields you need**:

```typescript
const listings = await Listing.find(
  { City: 'Palm Desert' },
  { ListingId: 1, ListPrice: 1, BedroomsTotal: 1, photos: 1 } // Projection
).lean();
```

---

### 3. Pagination

```typescript
const page = 1;
const limit = 20;
const skip = (page - 1) * limit;

const listings = await Listing.find({ City: 'Palm Desert' })
  .skip(skip)
  .limit(limit)
  .lean();

const total = await Listing.countDocuments({ City: 'Palm Desert' });
```

---

### 4. Aggregation Pipelines

**For complex queries**:

```typescript
const stats = await Listing.aggregate([
  { $match: { City: 'Palm Desert', ListingStatus: 'Active' } },
  {
    $group: {
      _id: null,
      avgPrice: { $avg: '$ListPrice' },
      medianPrice: { $median: { input: '$ListPrice', method: 'approximate' } },
      count: { $sum: 1 }
    }
  }
]);
```

---

## Backup & Recovery

### MongoDB Atlas Automated Backups

**Schedule**: Daily snapshots at 2:00 AM PST

**Retention**: 7 days

**Recovery**: Point-in-time recovery available

**Manual Backup**:
```bash
mongodump --uri="# Add your MongoDB connection string/jpsrealtor" --out=/backup/$(date +%Y-%m-%d)
```

---

## Data Integrity

### 1. Unique Constraints

**Enforce uniqueness**:
```javascript
db.listings.createIndex({ ListingId: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
db.neighborhoods.createIndex({ slug: 1 }, { unique: true })
```

---

### 2. Required Fields

**Mongoose schemas**:
```typescript
const listingSchema = new Schema({
  ListingId: { type: String, required: true, unique: true },
  ListPrice: { type: Number, required: true },
  City: { type: String, required: true },
  // ...
});
```

---

### 3. Data Validation

**Custom validators**:
```typescript
const neighborhoodSchema = new Schema({
  statistics: {
    medianPrice: {
      type: Number,
      validate: {
        validator: (v) => v >= 0,
        message: 'Median price cannot be negative'
      }
    }
  }
});
```

---

## Cross-References

- **Frontend Architecture**: See `FRONTEND_ARCHITECTURE.md`
- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
- **Collections Reference**: See `COLLECTIONS_REFERENCE.md`
- **Deployment**: See `DEPLOYMENT_PIPELINE.md`

---

## Next Steps for Developers

1. **Connect to database**: Use `mongodb+srv://` connection string
2. **Create indexes**: Run index creation scripts
3. **Test queries**: Use MongoDB Compass for query testing
4. **Monitor performance**: Set up slow query logging
5. **Implement caching**: Use Redis for frequently accessed data (future)

**Questions?** Refer to `DEVELOPER_ONBOARDING.md` for FAQs and troubleshooting.
