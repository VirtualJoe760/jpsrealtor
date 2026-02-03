# Property Auto-Enrichment Implementation Plan

## Problem Statement

When users create or edit contacts with addresses, property details (purchase price, purchase date, bedrooms, bathrooms, square footage, year built, property type) are **not automatically populated**. This forces users to manually enter data that already exists in the MLS database, leading to:

1. **Data entry friction** - Slows down contact creation
2. **Incomplete records** - Users skip fields they don't know
3. **Inaccurate CMAs** - Market activity comparables can't filter properly without subject property characteristics

## Current System Analysis

### What Works ✅
1. **ContactViewPanel** (F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\ContactViewPanel.tsx:236-263)
   - Fetches recent market activity when `latitude` and `longitude` exist on contact
   - Displays property info (beds, baths, sqft, year built, purchase price/date) from contact record
   - Shows map with comparable properties markers
   - Uses `/api/crm/contacts/[id]/comparables` endpoint

2. **Comparables API** (F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\[id]\comparables\route.ts)
   - Queries `UnifiedClosedListing` collection
   - Uses bounding box + filters for "like kind" properties
   - Supports optional filters: bedrooms, bathrooms, sqft, propertyType, hasPool
   - Calculates distance and sorts by proximity

3. **Contact Model** (implicit from ContactViewPanel usage)
   - Supports storing: `latitude`, `longitude`, `bedrooms`, `bathrooms`, `sqft`, `yearBuilt`, `propertyType`, `purchasePrice`, `purchaseDate`
   - These fields are displayed but NOT auto-populated on create/edit

### The Gap ❌
1. **No geocoding** - Address → lat/long conversion doesn't happen automatically
2. **No property lookup** - MLS data isn't queried when address is entered
3. **No auto-population** - Property fields remain empty even when MLS data exists
4. **No manual override** - Users can't easily edit/add property data if auto-enrichment fails

## Implementation Plan

### Phase 1: Backend Infrastructure 🔧

#### 1.1 Geocoding Utility
**File**: `src/lib/geocoding.ts`

```typescript
/**
 * Geocode address using Google Maps Geocoding API
 * Returns { lat, lng, formattedAddress } or null if not found
 */
export async function geocodeAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const addressString = [address.street, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(', ');

  if (!addressString) return null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[Geocoding] No Google Maps API key configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results[0]) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}
```

**Environment Variable**: Add to `.env.local`:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

#### 1.2 Property Lookup API
**File**: `src/app/api/crm/contacts/enrich/route.ts`

```typescript
/**
 * Property Enrichment API
 *
 * POST /api/crm/contacts/enrich
 * Body: { address: { street, city, state, zip } }
 *
 * Returns:
 * {
 *   success: true,
 *   geocode: { lat, lng, formattedAddress },
 *   property: { bedrooms, bathrooms, sqft, yearBuilt, ... },
 *   source: 'unified_listings' | 'unified_closed_listings' | 'agent_listings' | 'none'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { geocodeAddress } from '@/lib/geocoding';
import UnifiedListing from '@/models/unified-listing';
import UnifiedClosedListing from '@/models/unified-closed-listing';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { address } = await request.json();

    if (!address?.street || !address?.city || !address?.state) {
      return NextResponse.json({ success: false, error: 'Address required (street, city, state)' }, { status: 400 });
    }

    // Step 1: Geocode address
    console.log('[Property Enrichment] Geocoding address:', address);
    const geocode = await geocodeAddress(address);

    if (!geocode) {
      return NextResponse.json({
        success: false,
        error: 'Could not geocode address',
      }, { status: 404 });
    }

    console.log('[Property Enrichment] Geocoded to:', geocode);

    await dbConnect();

    // Step 2: Try exact address match in active listings
    let property = await UnifiedListing.findOne({
      $or: [
        { unparsedAddress: { $regex: new RegExp(address.street, 'i') } },
        {
          streetNumber: extractStreetNumber(address.street),
          streetName: { $regex: new RegExp(extractStreetName(address.street), 'i') },
          city: { $regex: new RegExp(address.city, 'i') },
        }
      ]
    }).select({
      bedsTotal: 1,
      bathroomsTotalDecimal: 1,
      bathroomsFull: 1,
      livingArea: 1,
      yearBuilt: 1,
      propertyType: 1,
      lotSizeAcres: 1,
      poolYN: 1,
      listPrice: 1,
    }).lean();

    let source = 'unified_listings';

    // Step 3: If not found, try closed listings (historical sales)
    if (!property) {
      property = await UnifiedClosedListing.findOne({
        $or: [
          { unparsedAddress: { $regex: new RegExp(address.street, 'i') } },
          {
            streetNumber: extractStreetNumber(address.street),
            streetName: { $regex: new RegExp(extractStreetName(address.street), 'i') },
            city: { $regex: new RegExp(address.city, 'i') },
          }
        ]
      }).sort({ closeDate: -1 }) // Most recent sale
        .select({
          bedsTotal: 1,
          bathroomsTotalDecimal: 1,
          bathroomsFull: 1,
          livingArea: 1,
          yearBuilt: 1,
          propertyType: 1,
          lotSizeAcres: 1,
          poolYN: 1,
          closePrice: 1,
          closeDate: 1,
        }).lean();

      source = 'unified_closed_listings';
    }

    // Step 4: If still not found, use nearest property (within 0.1 miles)
    if (!property) {
      const nearbyListings = await UnifiedListing.find({
        latitude: { $gte: geocode.lat - 0.001, $lte: geocode.lat + 0.001 },
        longitude: { $gte: geocode.lng - 0.001, $lte: geocode.lng + 0.001 },
      }).limit(1).select({
        bedsTotal: 1,
        bathroomsTotalDecimal: 1,
        bathroomsFull: 1,
        livingArea: 1,
        yearBuilt: 1,
        propertyType: 1,
        lotSizeAcres: 1,
        poolYN: 1,
        listPrice: 1,
      }).lean();

      if (nearbyListings.length > 0) {
        property = nearbyListings[0];
        source = 'unified_listings';
      }
    }

    if (!property) {
      console.log('[Property Enrichment] No property data found');
      return NextResponse.json({
        success: true,
        geocode,
        property: null,
        source: 'none',
      });
    }

    // Step 5: Format and return property data
    const enrichedData = {
      bedrooms: property.bedsTotal || null,
      bathrooms: property.bathroomsTotalDecimal || property.bathroomsFull || null,
      sqft: property.livingArea || null,
      yearBuilt: property.yearBuilt || null,
      propertyType: property.propertyType || null,
      lotSize: property.lotSizeAcres ? `${property.lotSizeAcres} acres` : null,
      pool: property.poolYN || false,
      purchasePrice: (property as any).closePrice || (property as any).listPrice || null,
      purchaseDate: (property as any).closeDate || null,
    };

    console.log('[Property Enrichment] Found property data:', enrichedData);

    return NextResponse.json({
      success: true,
      geocode,
      property: enrichedData,
      source,
    });

  } catch (error: any) {
    console.error('[Property Enrichment] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper functions
function extractStreetNumber(street: string): string {
  const match = street.match(/^\d+/);
  return match ? match[0] : '';
}

function extractStreetName(street: string): string {
  return street.replace(/^\d+\s*/, '');
}
```

### Phase 2: Frontend Integration 🎨

#### 2.1 Update ContactEditModal
**File**: `src/app/components/crm/messages/ContactEditModal.tsx`

**Changes**:
1. Add debounced address enrichment (triggers 1 second after user stops typing)
2. Add property data section (collapsible)
3. Add "Fetch Property Data" button
4. Add loading states
5. Add manual edit mode for property fields

```typescript
// Add state
const [enriching, setEnriching] = useState(false);
const [propertyData, setPropertyData] = useState({
  bedrooms: null,
  bathrooms: null,
  sqft: null,
  yearBuilt: null,
  propertyType: null,
  purchasePrice: null,
  purchaseDate: null,
  latitude: null,
  longitude: null,
});
const [isEditingPropertyData, setIsEditingPropertyData] = useState(false);

// Add debounced enrichment
useEffect(() => {
  const timer = setTimeout(() => {
    if (address.street && address.city && address.state) {
      handleEnrichProperty();
    }
  }, 1000); // Debounce 1 second

  return () => clearTimeout(timer);
}, [address.street, address.city, address.state, address.zip]);

const handleEnrichProperty = async () => {
  setEnriching(true);
  try {
    const response = await fetch('/api/crm/contacts/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();

    if (data.success && data.property) {
      setPropertyData({
        ...data.property,
        latitude: data.geocode.lat,
        longitude: data.geocode.lng,
      });
    }
  } catch (error) {
    console.error('[ContactEditModal] Error enriching property:', error);
  } finally {
    setEnriching(false);
  }
};

// Add property data section in UI
{propertyData.bedrooms && (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold">Property Details</h4>
      {enriching && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
      {!isEditingPropertyData && (
        <button
          onClick={() => setIsEditingPropertyData(true)}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Edit
        </button>
      )}
    </div>

    {isEditingPropertyData ? (
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          value={propertyData.bedrooms || ''}
          onChange={(e) => setPropertyData({...propertyData, bedrooms: e.target.value})}
          placeholder="Bedrooms"
          className="px-3 py-2 rounded border"
        />
        <input
          type="number"
          value={propertyData.bathrooms || ''}
          onChange={(e) => setPropertyData({...propertyData, bathrooms: e.target.value})}
          placeholder="Bathrooms"
          className="px-3 py-2 rounded border"
        />
        {/* ... more fields ... */}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>Bedrooms: {propertyData.bedrooms}</div>
        <div>Bathrooms: {propertyData.bathrooms}</div>
        <div>Sqft: {propertyData.sqft}</div>
        <div>Year Built: {propertyData.yearBuilt}</div>
      </div>
    )}
  </div>
)}
```

#### 2.2 Update AddContactModal
**Same changes as ContactEditModal** - Add property enrichment logic and UI

#### 2.3 Update Contact Save Logic
**Both modals**: Include property data in save payload

```typescript
const contactData = {
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  emails: emails.filter(e => e.address.trim()).map(e => ({...})),
  phones: phones.filter(p => p.number.trim()).map(p => ({...})),
  address: address.street || address.city ? address : undefined,

  // NEW: Property data
  latitude: propertyData.latitude,
  longitude: propertyData.longitude,
  bedrooms: propertyData.bedrooms,
  bathrooms: propertyData.bathrooms,
  sqft: propertyData.sqft,
  yearBuilt: propertyData.yearBuilt,
  propertyType: propertyData.propertyType,
  purchasePrice: propertyData.purchasePrice,
  purchaseDate: propertyData.purchaseDate,
};
```

### Phase 3: Database Schema Updates 💾

#### 3.1 Update Contact Model
**File**: `src/models/Contact.ts`

Add fields (if not already present):
```typescript
{
  latitude: { type: Number, index: true },
  longitude: { type: Number, index: true },
  bedrooms: Number,
  bathrooms: Number,
  sqft: Number,
  yearBuilt: Number,
  propertyType: String,
  purchasePrice: Number,
  purchaseDate: Date,
  lotSize: String,
  pool: Boolean,
}
```

**Migration**: No migration needed - these are optional fields

### Phase 4: Testing & Validation ✅

#### 4.1 Manual Testing Checklist
- [ ] Create new contact with full address → Property data auto-populates
- [ ] Edit existing contact, change address → Property data updates
- [ ] Enter invalid address → Graceful failure, no property data
- [ ] Edit property data manually → Saves correctly
- [ ] View contact in ContactViewPanel → Property info displays
- [ ] Recent market activity → Filters work with enriched data

#### 4.2 API Testing
```bash
# Test geocoding
curl -X POST http://localhost:3000/api/crm/contacts/enrich \
  -H "Content-Type: application/json" \
  -d '{"address":{"street":"50860 Calle Paloma","city":"La Quinta","state":"CA","zip":"92253"}}'

# Expected response:
{
  "success": true,
  "geocode": {
    "lat": 33.6833,
    "lng": -116.2928,
    "formattedAddress": "50860 Calle Paloma, La Quinta, CA 92253, USA"
  },
  "property": {
    "bedrooms": 5,
    "bathrooms": 5,
    "sqft": 3615,
    "yearBuilt": 1999,
    "propertyType": "Rsfr",
    "purchasePrice": 550000,
    "purchaseDate": "2015-12-09"
  },
  "source": "unified_closed_listings"
}
```

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1.1 | Geocoding utility | 1 hour | ⏸️ Not Started |
| 1.2 | Property enrichment API | 2 hours | ⏸️ Not Started |
| 2.1 | ContactEditModal updates | 2 hours | ⏸️ Not Started |
| 2.2 | AddContactModal updates | 1 hour | ⏸️ Not Started |
| 3.1 | Contact model schema | 30 min | ⏸️ Not Started |
| 4.1 | Testing & QA | 1.5 hours | ⏸️ Not Started |

**Total: ~8 hours**

## Benefits

1. **Faster contact creation** - No manual property data entry
2. **Better data quality** - MLS data is authoritative source
3. **Improved CMAs** - Comparables API can filter on accurate subject property characteristics
4. **User satisfaction** - "Magic" auto-population feels premium
5. **Scalability** - Batch enrichment script can backfill existing contacts

## Future Enhancements

1. **Batch enrichment script** - Enrich all existing contacts with addresses
2. **Caching** - Cache geocode results for 30 days, property data for 24 hours
3. **AVM integration** - Add Zillow/Redfin estimated value
4. **Property history timeline** - Show all sales for this property
5. **Owner lookup** - Match property owner name to contact name
