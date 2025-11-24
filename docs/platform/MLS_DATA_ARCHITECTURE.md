# MLS Data Architecture for Multi-Tenant Platform

**Version:** 2.0
**Last Updated:** 2025-01-23
**Purpose:** Define how ChatRealty handles per-agent MLS data at scale

---

## Executive Summary

ChatRealty uses a **per-agent MLS collection model** where each agent's MLS data is stored in tenant-scoped collections. This allows:

- ✅ **Agent data isolation** - Each agent owns their MLS data
- ✅ **Flexible MLS providers** - Support GPS, CRMLS, FlexMLS, Spark, etc.
- ✅ **Custom ingestion schedules** - Per-agent sync frequency
- ✅ **Billing by data volume** - Track storage per agent
- ✅ **Geographic flexibility** - Different MLSs serve different regions

---

## Database Schema Model

### **Per-Agent Collection Naming Convention**

**Pattern**: `{tenantId}_{mlsProvider}_listings`

**Examples**:
```
jpsrealtor_gps_listings           # JPS's GPS MLS data (11,592 docs)
jpsrealtor_crmls_listings         # JPS's CRMLS data (20,406 docs)
agent2_mls_listings               # Agent2's generic MLS data
agent3_flexmls_listings           # Agent3's FlexMLS data
agent4_spark_listings             # Agent4's Spark MLS data
```

---

## Collection Structure

### **Agent Listing Collections**

**Schema** (same for all agent collections):

```typescript
// Collection: {tenantId}_{mlsProvider}_listings
{
  _id: ObjectId,

  // Tenant identification
  tenantId: "jpsrealtor",              // ← Owner of this listing data
  mlsProvider: "gps",                  // ← MLS source (gps, crmls, flexmls, spark)

  // MLS identifiers
  ListingId: string (unique per collection),
  ListingKey: string (unique globally),
  MLSListingKey: string,               // Original MLS key

  // Standard fields (RESO compliant)
  UnparsedAddress: string,
  City: string,
  StateOrProvince: string,
  PostalCode: string,
  County: string,
  SubdivisionName: string,

  // Location (GeoJSON)
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },

  // Price
  ListPrice: number,
  OriginalListPrice: number,
  PricePerSquareFoot: number,

  // Property details
  BedroomsTotal: number,
  BathroomsTotalInteger: number,
  LivingArea: number,
  LotSizeSquareFeet: number,
  YearBuilt: number,
  PropertyType: string,
  PropertySubType: string,

  // Status
  ListingStatus: "Active" | "Pending" | "Closed" | "Expired",
  StandardStatus: string,
  DaysOnMarket: number,

  // Media
  photos: string[],                    // Cloudinary URLs
  photoCount: number,

  // Agent info
  ListAgentMlsId: string,
  ListAgentName: string,
  ListOfficeName: string,

  // Sync metadata
  lastSyncedAt: ISODate,              // When ChatRealty last updated this
  syncSource: string,                  // Which API endpoint

  // Timestamps
  ModificationTimestamp: ISODate,      // From MLS
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

### **Agent MLS Configuration Collection**

**Collection**: `agent_mls_configs`

**Purpose**: Store each agent's MLS API credentials and sync settings.

```typescript
{
  _id: ObjectId,
  tenantId: "jpsrealtor",

  mlsConfigs: [
    {
      provider: "gps",                 // MLS provider name
      apiKey: string (encrypted),      // API key
      apiSecret: string (encrypted),   // API secret (if needed)
      region: "Coachella Valley",      // Geographic coverage
      active: true,

      // Sync settings
      syncSchedule: "0 2 * * *",       // Cron: daily at 2 AM
      syncEnabled: true,
      lastSyncedAt: ISODate,

      // Collection mapping
      collectionName: "jpsrealtor_gps_listings",

      // Quotas
      maxListings: 50000,              // Billing tier limit
      currentListings: 11592,
    },
    {
      provider: "crmls",
      apiKey: string (encrypted),
      region: "Southern California",
      active: true,
      syncSchedule: "0 3 * * *",       // Cron: daily at 3 AM
      collectionName: "jpsrealtor_crmls_listings",
      maxListings: 50000,
      currentListings: 20406,
    }
  ],

  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

## Shared Reference Data

**Collections that are NOT tenant-scoped** (shared by all agents):

### **1. Cities**
```typescript
// Collection: shared_cities
{
  _id: ObjectId,
  name: "Palm Desert",
  slug: "palm-desert",
  state: "CA",
  county: "Riverside",
  coordinates: { latitude: 33.8303, longitude: -116.5453 },
  // ... (same as current cities collection)
}
```

### **2. Neighborhoods**
```typescript
// Collection: shared_neighborhoods
{
  _id: ObjectId,
  name: "Palm Desert Country Club",
  slug: "palm-desert-country-club",
  city: ObjectId (ref: shared_cities),
  // ... (same as current neighborhoods collection)
}
```

### **3. Schools**
```typescript
// Collection: shared_schools
{
  _id: ObjectId,
  name: "George Washington Elementary",
  type: "elementary",
  district: "Desert Sands Unified",
  // ... (same as current schools collection)
}
```

**Rationale**: Cities, neighborhoods, and schools are geographic facts that don't change per agent. Share this data to:
- Reduce duplication
- Ensure consistency
- Simplify maintenance

---

## Query Patterns

### **Per-Agent Listing Search**

**Frontend query** (agent-specific listings):

```typescript
import { connectToDatabase } from '@/lib/mongodb';

export async function searchListings(
  tenantId: string,
  mlsProvider: string,
  filters: SearchFilters
) {
  await connectToDatabase();

  // Dynamic collection name
  const collectionName = `${tenantId}_${mlsProvider}_listings`;
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);

  const query: any = {
    tenantId: tenantId,  // Extra safety check
    ListingStatus: 'Active'
  };

  if (filters.city) query.City = filters.city;
  if (filters.minPrice) query.ListPrice = { $gte: filters.minPrice };
  if (filters.maxPrice) query.ListPrice = { ...query.ListPrice, $lte: filters.maxPrice };
  if (filters.beds) query.BedroomsTotal = { $gte: filters.beds };

  const listings = await collection
    .find(query)
    .sort({ ListPrice: -1 })
    .limit(50)
    .toArray();

  return listings;
}
```

---

### **Multi-MLS Search** (agent has multiple MLS sources)

```typescript
export async function searchAllMLSForAgent(
  tenantId: string,
  filters: SearchFilters
) {
  await connectToDatabase();

  // Get agent's MLS configs
  const agentConfig = await AgentMLSConfig.findOne({ tenantId });

  // Search all active MLS sources
  const allListings = [];

  for (const mlsConfig of agentConfig.mlsConfigs) {
    if (!mlsConfig.active) continue;

    const listings = await searchListings(
      tenantId,
      mlsConfig.provider,
      filters
    );

    allListings.push(...listings);
  }

  // Deduplicate by ListingKey (cross-MLS duplicates)
  const uniqueListings = deduplicateByKey(allListings, 'ListingKey');

  // Sort by price
  uniqueListings.sort((a, b) => b.ListPrice - a.ListPrice);

  return uniqueListings;
}
```

---

### **Cross-Agent Search** (ChatRealty platform search)

**Use case**: Platform-wide search (e.g., "Find all homes in Palm Desert from any agent")

```typescript
export async function platformWideSearch(filters: SearchFilters) {
  await connectToDatabase();

  const db = mongoose.connection.db;

  // Get all agent listing collections
  const collections = await db.listCollections().toArray();
  const listingCollections = collections
    .filter(c => c.name.endsWith('_listings'))
    .map(c => c.name);

  const allListings = [];

  // Search across all agent collections
  for (const collectionName of listingCollections) {
    const collection = db.collection(collectionName);

    const query: any = { ListingStatus: 'Active' };
    if (filters.city) query.City = filters.city;
    if (filters.minPrice) query.ListPrice = { $gte: filters.minPrice };

    const listings = await collection.find(query).limit(50).toArray();
    allListings.push(...listings);
  }

  return allListings;
}
```

**Note**: This is resource-intensive. Use sparingly or implement aggregation pipeline.

---

## MLS Data Ingestion

### **Per-Agent Sync Process**

**Workflow**:
```
1. Cron job triggers (per agent's schedule)
   ↓
2. Fetch agent's MLS config from agent_mls_configs
   ↓
3. For each active MLS provider:
   a. Call MLS API with agent's credentials
   b. Fetch updated/new listings
   c. Upsert into {tenantId}_{provider}_listings
   d. Update lastSyncedAt timestamp
   ↓
4. Log sync results (success, failures, new listings)
```

**Implementation** (`chatRealty/cms/scripts/sync-agent-mls.ts`):

```typescript
import { connectToDatabase } from '../src/lib/mongodb';
import { AgentMLSConfig } from '../src/models/AgentMLSConfig';

export async function syncAgentMLS(tenantId: string) {
  await connectToDatabase();

  // Get agent config
  const agentConfig = await AgentMLSConfig.findOne({ tenantId });
  if (!agentConfig) {
    throw new Error(`No MLS config found for tenant: ${tenantId}`);
  }

  for (const mlsConfig of agentConfig.mlsConfigs) {
    if (!mlsConfig.active || !mlsConfig.syncEnabled) continue;

    console.log(`Syncing ${mlsConfig.provider} for ${tenantId}...`);

    try {
      // Call MLS API
      const listings = await fetchMLSListings(mlsConfig);

      // Get target collection
      const db = mongoose.connection.db;
      const collection = db.collection(mlsConfig.collectionName);

      // Upsert listings
      const bulkOps = listings.map(listing => ({
        updateOne: {
          filter: { ListingId: listing.ListingId, tenantId },
          update: {
            $set: {
              ...listing,
              tenantId,
              mlsProvider: mlsConfig.provider,
              lastSyncedAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const result = await collection.bulkWrite(bulkOps);

      console.log(`✓ ${mlsConfig.provider}: ${result.upsertedCount} new, ${result.modifiedCount} updated`);

      // Update sync timestamp
      mlsConfig.lastSyncedAt = new Date();
      mlsConfig.currentListings = await collection.countDocuments({ tenantId });
      await agentConfig.save();

    } catch (error) {
      console.error(`✗ Failed to sync ${mlsConfig.provider}:`, error);
    }
  }
}

// Helper: Fetch listings from MLS API
async function fetchMLSListings(mlsConfig: MLSConfig) {
  switch (mlsConfig.provider) {
    case 'gps':
      return fetchGPSListings(mlsConfig.apiKey);
    case 'crmls':
      return fetchCRMLSListings(mlsConfig.apiKey);
    case 'spark':
      return fetchSparkListings(mlsConfig.apiKey);
    default:
      throw new Error(`Unknown MLS provider: ${mlsConfig.provider}`);
  }
}
```

---

### **Cron Job Setup**

**Using node-cron**:

```typescript
// chatRealty/cms/src/cron/mlsSync.ts
import cron from 'node-cron';
import { syncAgentMLS } from '../scripts/sync-agent-mls';
import { AgentMLSConfig } from '../models/AgentMLSConfig';

export function initMLSSyncJobs() {
  // Check for agents needing sync every hour
  cron.schedule('0 * * * *', async () => {
    const agents = await AgentMLSConfig.find({ 'mlsConfigs.syncEnabled': true });

    for (const agent of agents) {
      for (const mlsConfig of agent.mlsConfigs) {
        if (!mlsConfig.syncEnabled) continue;

        // Check if sync is due (based on cron schedule)
        const isDue = checkIfSyncDue(mlsConfig.syncSchedule, mlsConfig.lastSyncedAt);

        if (isDue) {
          console.log(`Starting sync for ${agent.tenantId} - ${mlsConfig.provider}`);
          await syncAgentMLS(agent.tenantId);
        }
      }
    }
  });
}
```

---

## Migration Plan

### **Phase 1: Rename Current Collections**

```javascript
// Rename existing collections to tenant-scoped names
db.listings.renameCollection('jpsrealtor_gps_listings');
db.crmlsListings.renameCollection('jpsrealtor_crmls_listings');

// Add tenantId and mlsProvider to all documents
db.jpsrealtor_gps_listings.updateMany(
  {},
  {
    $set: {
      tenantId: 'jpsrealtor',
      mlsProvider: 'gps',
      lastSyncedAt: new Date()
    }
  }
);

db.jpsrealtor_crmls_listings.updateMany(
  {},
  {
    $set: {
      tenantId: 'jpsrealtor',
      mlsProvider: 'crmls',
      lastSyncedAt: new Date()
    }
  }
);
```

---

### **Phase 2: Create Agent MLS Config**

```javascript
db.agent_mls_configs.insertOne({
  tenantId: 'jpsrealtor',
  mlsConfigs: [
    {
      provider: 'gps',
      apiKey: process.env.GPS_MLS_KEY,  // Encrypted
      region: 'Coachella Valley',
      active: true,
      syncSchedule: '0 2 * * *',
      syncEnabled: true,
      lastSyncedAt: new Date(),
      collectionName: 'jpsrealtor_gps_listings',
      maxListings: 50000,
      currentListings: 11592
    },
    {
      provider: 'crmls',
      apiKey: process.env.CRMLS_API_KEY,  // Encrypted
      region: 'Southern California',
      active: true,
      syncSchedule: '0 3 * * *',
      syncEnabled: true,
      lastSyncedAt: new Date(),
      collectionName: 'jpsrealtor_crmls_listings',
      maxListings: 50000,
      currentListings: 20406
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

### **Phase 3: Update Frontend Queries**

**Before** (hardcoded collection):
```typescript
const listings = await Listing.find({ City: 'Palm Desert' });
```

**After** (tenant-aware):
```typescript
const listings = await searchListings('jpsrealtor', 'gps', {
  city: 'Palm Desert'
});
```

---

## Indexing Strategy

### **Per-Collection Indexes**

**Create indexes for each agent listing collection**:

```javascript
// For: jpsrealtor_gps_listings, jpsrealtor_crmls_listings, etc.

db.{collectionName}.createIndex({ tenantId: 1, ListingStatus: 1 });
db.{collectionName}.createIndex({ tenantId: 1, City: 1, ListingStatus: 1 });
db.{collectionName}.createIndex({ tenantId: 1, ListPrice: 1 });
db.{collectionName}.createIndex({ location: "2dsphere" });
db.{collectionName}.createIndex({ ListingId: 1, tenantId: 1 }, { unique: true });
db.{collectionName}.createIndex({ ListingKey: 1 }, { unique: true, sparse: true });
```

**Auto-create indexes when new agent added**:

```typescript
export async function createAgentMLSCollection(tenantId: string, mlsProvider: string) {
  const collectionName = `${tenantId}_${mlsProvider}_listings`;
  const db = mongoose.connection.db;

  // Create collection
  await db.createCollection(collectionName);
  const collection = db.collection(collectionName);

  // Create indexes
  await collection.createIndex({ tenantId: 1, ListingStatus: 1 });
  await collection.createIndex({ tenantId: 1, City: 1, ListingStatus: 1 });
  await collection.createIndex({ tenantId: 1, ListPrice: 1 });
  await collection.createIndex({ location: "2dsphere" });
  await collection.createIndex({ ListingId: 1, tenantId: 1 }, { unique: true });
  await collection.createIndex({ ListingKey: 1 }, { unique: true, sparse: true });

  console.log(`✓ Created collection: ${collectionName} with indexes`);
}
```

---

## Benefits of This Architecture

✅ **Data Isolation** - Agent data is completely separate
✅ **Flexible MLS Support** - Each agent can use different MLSs
✅ **Custom Sync Schedules** - Per-agent sync frequency
✅ **Billing by Usage** - Track storage/listings per agent
✅ **Geographic Flexibility** - Agents in different regions
✅ **Scalable** - Add unlimited agents without schema changes
✅ **Security** - API keys encrypted per agent

---

## Cross-References

- **Database Architecture**: See `DATABASE_ARCHITECTURE.md`
- **Multi-Tenant Strategy**: See `MULTI_TENANT_ARCHITECTURE.md`
- **Collections Reference**: See `COLLECTIONS_REFERENCE.md`

---

## Next Steps

1. ✅ Rename existing collections (listings → jpsrealtor_gps_listings)
2. ✅ Add tenantId/mlsProvider fields
3. ✅ Create agent_mls_configs collection
4. ✅ Update frontend queries to use dynamic collection names
5. ✅ Implement MLS sync script
6. ✅ Set up cron jobs for automated syncs
7. ✅ Test with jpsrealtor as first agent

**Questions?** Refer to `DEVELOPER_ONBOARDING.md` for implementation guide.
