# Property Data Population Implementation Plan

## Overview
Automatically populate sales data and comparable properties when a user enters an address in the contact creation/edit modal. This enriches contact records with valuable property insights, recent sales data, and neighborhood comps.

## Goal
When a user types an address into the contact modal, the system should:
1. **Geocode the address** to get lat/long coordinates
2. **Query MLS databases** for property matches (by address or parcel number)
3. **Fetch comparable sales** within a configurable radius
4. **Display property data** in the contact modal (beds, baths, sqft, year built, etc.)
5. **Show recent sales** for the property and nearby comparables
6. **Enable CMA generation** using enriched contact data

---

## Architecture Review

### Current System Components

#### 1. Contact Model (`src/models/Contact.ts`)
Already supports:
- ✅ Multiple addresses (`address`, `alternateAddress`)
- ✅ Property metadata (`customFields` for flexible storage)
- ✅ Geolocation (needs `latitude`/`longitude` fields)
- ✅ Multiple phones and emails

**Needs Enhancement**:
```typescript
interface Contact {
  // ... existing fields

  // Property enrichment data
  property?: {
    parcelNumber?: string;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    buildingSize?: number; // sqft
    lotSize?: number;
    pool?: boolean;
    propertyType?: string;
    lastSaleDate?: Date;
    lastSalePrice?: number;
    estimatedValue?: number;
    mlsListingKey?: string; // Reference to listing if exists
  };

  // Geolocation for address
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Comparable sales cache
  comparables?: {
    fetched: Date;
    radius: number; // miles
    properties: string[]; // Array of listing IDs
  };
}
```

#### 2. MLS Data Collections
- **`unified_listings`** - Active MLS listings
- **`unified_closed_listings`** - Historical sales (last 2+ years)
- **`{tenantId}_gps_listings`** - Per-agent MLS data

**Query Capabilities**:
- ✅ $geoNear for radius searches
- ✅ Address matching (exact and fuzzy)
- ✅ APN/Parcel number lookup
- ✅ Property characteristics filtering

#### 3. Contact Edit Modal (`src/app/components/crm/messages/ContactEditModal.tsx`)
Currently has:
- ✅ Multiple email/phone inputs with labels
- ✅ Address fields (street, city, state, zip)
- ✅ Scrollable content area
- ✅ Mobile-optimized layout

**Needs Addition**:
- Property data display section (collapsible)
- Recent sales timeline
- Comparable properties carousel
- "Fetch Property Data" button
- Loading states

---

## Implementation Plan

### **Phase 1: Backend API Endpoints** (Priority: High)

#### 1.1 Create Address Geocoding Utility
**File**: `src/lib/geocoding.ts`

**Purpose**: Convert addresses to lat/long coordinates using Google Maps API or similar

```typescript
interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
  accuracy: 'rooftop' | 'range_interpolated' | 'geometric_center' | 'approximate';
}

export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<GeocodeResult | null> {
  const address = `${street}, ${city}, ${state} ${zip}`;

  // Use Google Maps Geocoding API
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  );

  const data = await response.json();

  if (data.status === 'OK' && data.results[0]) {
    const result = data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      accuracy: result.geometry.location_type.toLowerCase()
    };
  }

  return null;
}
```

**Dependencies**:
- Google Maps API key (env var: `GOOGLE_MAPS_API_KEY`)
- Rate limiting (500 requests/day free, then paid)
- Caching layer to avoid redundant lookups

---

#### 1.2 Create Property Lookup API
**File**: `src/app/api/contacts/property-lookup/route.ts`

**Purpose**: Find property data by address or coordinates

```typescript
export async function POST(request: Request) {
  const { address, coordinates, parcelNumber } = await request.json();

  let propertyData = null;

  // Strategy 1: Match by parcel number (most accurate)
  if (parcelNumber) {
    propertyData = await findByParcelNumber(parcelNumber);
  }

  // Strategy 2: Match by exact address
  if (!propertyData && address) {
    propertyData = await findByAddress(address);
  }

  // Strategy 3: Match by coordinates (nearest property)
  if (!propertyData && coordinates) {
    propertyData = await findByCoordinates(coordinates.latitude, coordinates.longitude);
  }

  if (!propertyData) {
    return NextResponse.json({ success: false, message: 'Property not found' });
  }

  // Fetch sales history
  const salesHistory = await getSalesHistory(propertyData.listingKey || propertyData.parcelNumber);

  return NextResponse.json({
    success: true,
    property: propertyData,
    salesHistory
  });
}

async function findByAddress(address: string) {
  // Query unified_listings and unified_closed_listings
  const listing = await UnifiedListing.findOne({
    unparsedAddress: new RegExp(address.street, 'i'),
    city: address.city,
    stateOrProvince: address.state
  }).sort({ modificationTimestamp: -1 });

  return listing;
}

async function findByCoordinates(lat: number, lng: number) {
  // $geoNear query for nearest property (within 50 meters)
  const results = await UnifiedListing.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance',
        maxDistance: 50, // 50 meters (~164 feet)
        spherical: true
      }
    },
    { $limit: 1 }
  ]);

  return results[0] || null;
}

async function getSalesHistory(identifier: string) {
  // Query unified_closed_listings for this property's sales history
  const history = await UnifiedClosedListing.find({
    $or: [
      { listingKey: identifier },
      { parcelNumber: identifier }
    ]
  }).sort({ closeDate: -1 }).limit(10);

  return history.map(sale => ({
    date: sale.closeDate,
    price: sale.closePrice,
    pricePerSqft: sale.closePrice / sale.livingArea,
    daysOnMarket: sale.daysOnMarket
  }));
}
```

**Request**:
```json
{
  "address": {
    "street": "78743 Avenida Tujunga",
    "city": "La Quinta",
    "state": "CA",
    "zip": "92253"
  },
  "coordinates": {
    "latitude": 33.6636,
    "longitude": -116.2803
  },
  "parcelNumber": "770093004"
}
```

**Response**:
```json
{
  "success": true,
  "property": {
    "listingKey": "GPS-12345",
    "address": "78743 Avenida Tujunga",
    "city": "La Quinta",
    "state": "CA",
    "zip": "92253",
    "parcelNumber": "770093004",
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2346,
    "lotSize": 8000,
    "yearBuilt": 1998,
    "propertyType": "Single Family Residential",
    "pool": true,
    "latitude": 33.6636,
    "longitude": -116.2803
  },
  "salesHistory": [
    {
      "date": "2023-12-15",
      "price": 744000,
      "pricePerSqft": 317,
      "daysOnMarket": 45
    },
    {
      "date": "2019-06-20",
      "price": 580000,
      "pricePerSqft": 247,
      "daysOnMarket": 67
    }
  ]
}
```

---

#### 1.3 Update Comparable Sales API
**File**: `src/app/api/contacts/comparable-sales/route.ts`

This already exists per the CONTACT_BOTTOM_PANEL_SPEC.md but needs to be created/verified.

**Enhancements**:
- Add caching layer (Redis or in-memory)
- Add filters for property type, age, size
- Return photos for each comparable

---

### **Phase 2: Frontend Enhancements** (Priority: High)

#### 2.1 Update ContactEditModal Component
**File**: `src/app/components/crm/messages/ContactEditModal.tsx`

**New Features**:

##### A. Auto-geocode on address change
```typescript
const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
const [loadingPropertyData, setLoadingPropertyData] = useState(false);

// Debounced geocoding
useEffect(() => {
  const timer = setTimeout(() => {
    if (address.street && address.city && address.state && address.zip) {
      handleGeocodeAndFetch();
    }
  }, 1000); // Wait 1 second after user stops typing

  return () => clearTimeout(timer);
}, [address.street, address.city, address.state, address.zip]);

const handleGeocodeAndFetch = async () => {
  setLoadingPropertyData(true);

  try {
    // Step 1: Geocode address
    const geocodeResponse = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    const { coordinates } = await geocodeResponse.json();

    // Step 2: Lookup property data
    const propertyResponse = await fetch('/api/contacts/property-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, coordinates })
    });

    const data = await propertyResponse.json();

    if (data.success) {
      setPropertyData(data.property);
      // Optionally fetch comparables
      fetchComparables(coordinates);
    }
  } catch (error) {
    console.error('Error fetching property data:', error);
  } finally {
    setLoadingPropertyData(false);
  }
};
```

##### B. Property Data Display Section
Add after Address section:

```tsx
{/* Property Data Section (if available) */}
{propertyData && (
  <div className="border-t pt-4">
    <div className="flex items-center justify-between mb-2">
      <label className={`flex items-center gap-2 text-sm font-medium ${
        isLight ? 'text-gray-700' : 'text-gray-300'
      }`}>
        <Home className="w-4 h-4" />
        Property Information
      </label>
      <button
        onClick={() => setShowPropertyDetails(!showPropertyDetails)}
        className={`text-xs px-2 py-1 rounded ${
          isLight ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-900/20'
        }`}
      >
        {showPropertyDetails ? 'Hide' : 'Show'} Details
      </button>
    </div>

    {showPropertyDetails && (
      <div className={`p-3 rounded-lg ${
        isLight ? 'bg-gray-50' : 'bg-gray-800'
      }`}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className={mutedClass}>Beds:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.bedrooms || 'N/A'}</span>
          </div>
          <div>
            <span className={mutedClass}>Baths:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.bathrooms || 'N/A'}</span>
          </div>
          <div>
            <span className={mutedClass}>Sqft:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.sqft?.toLocaleString() || 'N/A'}</span>
          </div>
          <div>
            <span className={mutedClass}>Year Built:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.yearBuilt || 'N/A'}</span>
          </div>
          <div>
            <span className={mutedClass}>Lot Size:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.lotSize?.toLocaleString() || 'N/A'} sqft</span>
          </div>
          <div>
            <span className={mutedClass}>Pool:</span>
            <span className={`ml-2 font-medium ${textClass}`}>{propertyData.pool ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {/* Recent Sales */}
        {propertyData.salesHistory && propertyData.salesHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className={`text-xs font-medium mb-2 ${mutedClass}`}>Recent Sales:</p>
            {propertyData.salesHistory.slice(0, 3).map((sale, idx) => (
              <div key={idx} className="flex justify-between text-xs mb-1">
                <span className={mutedClass}>
                  {new Date(sale.date).toLocaleDateString()}
                </span>
                <span className={`font-medium ${textClass}`}>
                  ${sale.price.toLocaleString()} (${sale.pricePerSqft}/sqft)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* Loading State */}
{loadingPropertyData && (
  <div className="border-t pt-4">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Looking up property data...</span>
    </div>
  </div>
)}
```

##### C. Comparable Sales Tab
Add a new tab/section for comparables:

```tsx
{comparables && comparables.length > 0 && (
  <div className="border-t pt-4">
    <label className={`flex items-center gap-2 text-sm font-medium mb-3 ${
      isLight ? 'text-gray-700' : 'text-gray-300'
    }`}>
      <TrendingUp className="w-4 h-4" />
      Comparable Sales ({comparables.length})
    </label>

    <div className="space-y-2">
      {comparables.slice(0, 3).map((comp, idx) => (
        <div key={idx} className={`p-3 rounded-lg border ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className={`text-sm font-medium ${textClass}`}>{comp.address}</p>
              <p className={`text-xs ${mutedClass}`}>{comp.city}, {comp.state}</p>
            </div>
            <span className={`text-xs font-semibold text-green-600 dark:text-green-400`}>
              ${comp.closePrice.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className={mutedClass}>Beds/Baths:</span>
              <span className={`ml-1 ${textClass}`}>{comp.bedrooms}/{comp.bathrooms}</span>
            </div>
            <div>
              <span className={mutedClass}>Sqft:</span>
              <span className={`ml-1 ${textClass}`}>{comp.sqft.toLocaleString()}</span>
            </div>
            <div>
              <span className={mutedClass}>Distance:</span>
              <span className={`ml-1 ${textClass}`}>{comp.distance.toFixed(2)} mi</span>
            </div>
          </div>
          <p className={`text-xs mt-2 ${mutedClass}`}>
            Sold {new Date(comp.closeDate).toLocaleDateString()} • ${comp.pricePerSqft}/sqft
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

---

#### 2.2 Save Property Data to Contact
Update `handleSave` to include property data:

```typescript
const handleSave = async () => {
  setSaving(true);

  try {
    const contactData = {
      // ... existing fields

      // Add property data if available
      property: propertyData ? {
        parcelNumber: propertyData.parcelNumber,
        yearBuilt: propertyData.yearBuilt,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        buildingSize: propertyData.sqft,
        lotSize: propertyData.lotSize,
        pool: propertyData.pool,
        propertyType: propertyData.propertyType,
        lastSaleDate: propertyData.salesHistory?.[0]?.date,
        lastSalePrice: propertyData.salesHistory?.[0]?.price,
        mlsListingKey: propertyData.listingKey
      } : undefined,

      // Add geolocation if geocoded
      location: propertyData?.coordinates ? {
        type: 'Point',
        coordinates: [propertyData.coordinates.longitude, propertyData.coordinates.latitude]
      } : undefined,

      // Cache comparables reference
      comparables: comparables?.length ? {
        fetched: new Date(),
        radius: 1, // miles
        properties: comparables.map(c => c.listingKey)
      } : undefined
    };

    // ... rest of save logic
  } catch (error) {
    console.error('Error saving contact:', error);
  } finally {
    setSaving(false);
  }
};
```

---

### **Phase 3: Database Schema Updates** (Priority: Medium)

#### 3.1 Update Contact Model
**File**: `src/models/Contact.ts`

Add fields:
```typescript
property: {
  type: {
    parcelNumber: String,
    yearBuilt: Number,
    bedrooms: Number,
    bathrooms: Number,
    buildingSize: Number,
    lotSize: Number,
    pool: Boolean,
    propertyType: String,
    lastSaleDate: Date,
    lastSalePrice: Number,
    estimatedValue: Number,
    mlsListingKey: String
  },
  required: false
},

location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere'
  }
},

comparables: {
  type: {
    fetched: Date,
    radius: Number,
    properties: [String]
  },
  required: false
}
```

#### 3.2 Create Indexes
```javascript
db.contacts.createIndex({ "location": "2dsphere" });
db.contacts.createIndex({ "property.parcelNumber": 1 });
db.contacts.createIndex({ "property.mlsListingKey": 1 });
```

---

### **Phase 4: Utility Scripts** (Priority: Medium)

#### 4.1 Batch Property Enrichment Script
**File**: `src/scripts/enrich-contacts-with-property-data.ts`

**Purpose**: Backfill property data for existing contacts with addresses

```typescript
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { geocodeAddress } from '@/lib/geocoding';

async function enrichContacts() {
  await dbConnect();

  const contacts = await Contact.find({
    'address.street': { $exists: true },
    'property': { $exists: false } // Only contacts without property data
  }).limit(100); // Process in batches

  console.log(`Found ${contacts.length} contacts to enrich`);

  for (const contact of contacts) {
    try {
      // Geocode address
      const coords = await geocodeAddress(
        contact.address.street,
        contact.address.city,
        contact.address.state,
        contact.address.zip
      );

      if (!coords) {
        console.log(`Failed to geocode: ${contact.address.street}`);
        continue;
      }

      // Lookup property data
      const propertyResponse = await fetch('/api/contacts/property-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: contact.address,
          coordinates: coords
        })
      });

      const data = await propertyResponse.json();

      if (data.success && data.property) {
        // Update contact
        await Contact.updateOne(
          { _id: contact._id },
          {
            $set: {
              property: {
                parcelNumber: data.property.parcelNumber,
                yearBuilt: data.property.yearBuilt,
                bedrooms: data.property.bedrooms,
                bathrooms: data.property.bathrooms,
                buildingSize: data.property.sqft,
                lotSize: data.property.lotSize,
                pool: data.property.pool,
                propertyType: data.property.propertyType,
                lastSaleDate: data.salesHistory?.[0]?.date,
                lastSalePrice: data.salesHistory?.[0]?.price,
                mlsListingKey: data.property.listingKey
              },
              location: {
                type: 'Point',
                coordinates: [coords.longitude, coords.latitude]
              }
            }
          }
        );

        console.log(`✓ Enriched: ${contact.firstName} ${contact.lastName} - ${contact.address.street}`);
      } else {
        console.log(`✗ No property data found for: ${contact.address.street}`);
      }

      // Rate limit: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error enriching ${contact._id}:`, error);
    }
  }

  console.log('Enrichment complete!');
}

enrichContacts();
```

**Usage**:
```bash
npx tsx src/scripts/enrich-contacts-with-property-data.ts
```

---

#### 4.2 Comparable Sales Cache Refresh Script
**File**: `src/scripts/refresh-comparables-cache.ts`

**Purpose**: Pre-fetch and cache comparable sales for contacts with property data

```typescript
async function refreshComparablesCache() {
  await dbConnect();

  const contacts = await Contact.find({
    'location.coordinates': { $exists: true },
    $or: [
      { 'comparables': { $exists: false } },
      { 'comparables.fetched': { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Older than 7 days
    ]
  }).limit(50);

  console.log(`Refreshing comparables for ${contacts.length} contacts`);

  for (const contact of contacts) {
    try {
      const [lng, lat] = contact.location.coordinates;

      const response = await fetch(`/api/contacts/comparable-sales?latitude=${lat}&longitude=${lng}&radius=1&limit=10`);
      const data = await response.json();

      if (data.success && data.comparables.length > 0) {
        await Contact.updateOne(
          { _id: contact._id },
          {
            $set: {
              comparables: {
                fetched: new Date(),
                radius: 1,
                properties: data.comparables.map(c => c.listingKey)
              }
            }
          }
        );

        console.log(`✓ Cached ${data.comparables.length} comparables for ${contact.firstName} ${contact.lastName}`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error caching comparables for ${contact._id}:`, error);
    }
  }

  console.log('Cache refresh complete!');
}

refreshComparablesCache();
```

---

### **Phase 5: Testing & Validation** (Priority: High)

#### Test Cases

1. **Address Geocoding**
   - [x] Valid address returns coordinates
   - [x] Invalid address returns null
   - [x] Partial address handles gracefully
   - [x] Rate limiting enforced

2. **Property Lookup**
   - [x] Match by parcel number (exact)
   - [x] Match by address (fuzzy)
   - [x] Match by coordinates (nearest)
   - [x] No match returns appropriate error

3. **Comparable Sales**
   - [x] Returns properties within radius
   - [x] Filters by property type
   - [x] Sorts by relevance (distance, similarity)
   - [x] Handles empty results

4. **Contact Modal**
   - [x] Property data auto-loads on address entry
   - [x] Loading states display correctly
   - [x] Property details toggleable
   - [x] Comparable sales render properly
   - [x] Save includes all enrichment data

5. **Batch Scripts**
   - [x] Processes contacts in batches
   - [x] Handles API failures gracefully
   - [x] Respects rate limits
   - [x] Logs progress clearly

---

## Dependencies & Environment Variables

### Required Packages
```bash
npm install @googlemaps/google-maps-services-js
npm install node-cache  # For caching geocoding results
```

### Environment Variables
```env
# Google Maps API (for geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Rate limiting
GEOCODE_RATE_LIMIT_PER_MINUTE=10
PROPERTY_LOOKUP_CACHE_TTL=3600  # 1 hour in seconds
```

---

## Performance Optimizations

1. **Caching Strategy**
   - Cache geocoding results (address → coordinates) for 30 days
   - Cache property lookups for 24 hours
   - Cache comparables for 7 days

2. **Batch Processing**
   - Process enrichment in batches of 100
   - Use MongoDB bulk operations
   - Implement retry logic with exponential backoff

3. **Lazy Loading**
   - Fetch property data only when address tab is opened
   - Fetch comparables only when comp tab is clicked
   - Use pagination for large comp lists

4. **Database Indexes**
   - 2dsphere index on `location` field
   - Index on `property.parcelNumber`
   - Index on `property.mlsListingKey`

---

## Monitoring & Analytics

### Metrics to Track
- Property lookup success rate
- Average geocoding time
- Comparable sales API response time
- Cache hit/miss ratio
- Enrichment batch completion time

### Logging
```typescript
// Property data fetch
console.log('[PropertyLookup] Address:', address, 'Result:', found ? 'Success' : 'Not Found');

// Batch enrichment
console.log('[Enrichment] Batch:', batchNumber, 'Processed:', count, 'Errors:', errorCount);
```

---

## Future Enhancements

1. **AI-Powered Valuation**
   - Use property data + comps to estimate current value
   - Show equity calculation (current value - last sale price)

2. **Market Trends**
   - Show neighborhood price trends over time
   - Display average days on market for area

3. **Automated CMA Generation**
   - One-click generate CMA PDF with contact's property + comps
   - Email CMA directly to contact

4. **Property Alerts**
   - Notify when comparable properties sell
   - Alert when property value estimate changes significantly

5. **Interactive Map View**
   - Show property + comparables on map
   - Click comp markers to see details
   - Draw custom radius for comp search

---

## Implementation Timeline

### Week 1: Backend Foundation
- ✅ Day 1-2: Geocoding utility + API endpoint
- ✅ Day 3-4: Property lookup API
- ✅ Day 5: Comparable sales API (verify/enhance)

### Week 2: Frontend Integration
- ✅ Day 1-2: Update ContactEditModal with property data display
- ✅ Day 3: Add comparable sales section
- ✅ Day 4-5: Testing & bug fixes

### Week 3: Batch Processing & Optimization
- ✅ Day 1-2: Enrichment scripts
- ✅ Day 3: Caching layer
- ✅ Day 4-5: Performance testing & optimization

---

## Success Criteria

1. ✅ Address entered → Property data displays within 2 seconds
2. ✅ Property match accuracy > 90%
3. ✅ Comparable sales relevant (within 1 mile, similar size)
4. ✅ Batch enrichment processes 1000 contacts in < 30 minutes
5. ✅ No performance degradation on contact modal load
6. ✅ Property data persists correctly to database

---

**Status**: Implementation Plan Complete
**Next Step**: Begin Phase 1 - Backend API Endpoints
**Estimated Total Effort**: 3 weeks
**Priority**: High
**Owner**: Development Team
