# Property Enrichment Strategy

## Overview

This document outlines how to leverage rich property data from neighborhood farming lists to create highly enriched contact records with visual context, historical insights, and intelligent lead scoring.

## Data Sources

### 1. Property Ownership Data (Import Source)
From CSV exports (e.g., Old Town 247 neighborhood):
- **Owner Information**: Multiple owners, names, contact info
- **Property Address**: Site Address, Site City, Site State, Site Zip
- **Mailing Address**: Mail Address, Mailing City, Mailing State, Mailing Zip
- **Geolocation**: Latitude, Longitude (precise property coordinates)
- **Property Details**: Beds, Baths, Building Size, Lot Size, Acreage, Year Built
- **Property Features**: Pool, Fireplace, View, Number of Stories, Garage Type
- **Ownership Data**: Owner Occupied, Purchase Date, Purchase Price, Assessed Value
- **Contact Data**: Email, Phone, 5x Alternate Phones with line types
- **Legal Info**: APN/Parcel Number, Legal Description, Zoning Code

### 2. Listing Database Cross-Reference
- **`unified_listings`** - Active MLS listings
- **`unified_closed_listings`** - Historical sales data

## Smart Data Quality Fixes

### Name Parsing Logic
**Issue**: Property records often have inconsistent owner names.

**Example**:
```
1st Owner's First Name: "Mcintyre"
1st Owner's Last Name: (blank)
2nd Owner's First Name: "Marvin"
2nd Owner's Last Name: "Mcintyre"
All Owners: "Mcintyre and Marvin Mcintyre"
```

**Fix**: Use "All Owners" field to parse proper names:
- Parse patterns like "LastName and FirstName LastName"
- Extract: First Name = "Marvin", Last Name = "Mcintyre"
- Store both owners if joint ownership

### Multi-Phone Strategy
Store all phone numbers with metadata:
```typescript
contact.phones = [
  { number: "7602728035", type: "Mobile", primary: true },
  { number: "7607714991", type: "Landline", primary: false },
  { number: "7605743508", type: "Mobile", primary: false },
  { number: "7604239181", type: "Mobile", primary: false },
  { number: "7603603585", type: "Landline", primary: false },
  { number: "7608998976", type: "Mobile", primary: false }
]
```

**Use Cases**:
- Drop Cowboy multi-number campaigns
- Phone number rotation for higher reach
- Line type filtering (mobile-first for SMS)

### Absentee Owner Detection
**Strategy**: Compare mailing address vs property address

```typescript
const isAbsenteeOwner =
  contact.mailingAddress !== contact.propertyAddress;

if (isAbsenteeOwner) {
  contact.tags.push("Absentee Owner");
  contact.leadScore += 20; // High-value farming lead
}
```

**Why It Matters**: Absentee owners are more likely to sell, rent, or need property management.

## Contact Model Enhancement

### Current Model
```typescript
interface Contact {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  tags?: string[];
  listIds?: string[];
}
```

### Enhanced Model (Proposed)
```typescript
interface EnrichedContact extends Contact {
  // Multi-address support
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  };

  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Multi-phone support
  phones: Array<{
    number: string;
    type: "Mobile" | "Landline" | "VoIP";
    primary: boolean;
  }>;

  // Property metadata
  property: {
    parcelNumber: string;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    buildingSize?: number; // sqft
    lotSize?: number; // sqft
    acreage?: number;
    pool?: boolean;
    fireplace?: boolean;
    view?: boolean;
    stories?: number;
    garageType?: string;
    propertyType: string; // Rsfr, Condo, etc.
    zoning?: string;
    legalDescription?: string;
  };

  // Ownership data
  ownership: {
    ownerOccupied: boolean;
    purchaseDate?: string;
    purchasePrice?: number;
    assessedValue?: number;
    marketValue?: number;
    jointOwners?: Array<{
      firstName: string;
      lastName: string;
    }>;
  };

  // Enrichment data (from cross-referencing)
  enrichment?: {
    hasListingHistory: boolean;
    lastSaleDate?: string;
    lastSalePrice?: number;
    listingPhotos?: string[]; // URLs from past listings
    priceHistory?: Array<{
      date: string;
      price: number;
      type: "sale" | "listing";
    }>;
    nearbyListings?: string[]; // IDs of nearby active listings
    nearbyClosedSales?: string[]; // IDs of nearby closed sales
  };

  // Lead scoring
  leadScore: number;
  leadReasons: string[]; // ["Absentee Owner", "High-value Property", "Recently Purchased"]

  // Custom fields (flexible storage)
  customFields: Record<string, any>;
}
```

## Property Enrichment Pipeline

### Phase 1: Data Import (Current - Implemented)
✅ Parse CSV with all fields
✅ Smart name parsing from "All Owners"
✅ Multiple phone number preservation
✅ Absentee owner detection
✅ Geolocation storage (lat/long)
✅ Property metadata storage

### Phase 2: Listing Cross-Reference (Planned)
Use APN/Parcel Number + Address to match against listing databases:

```typescript
async function enrichContactWithListingData(contact: EnrichedContact) {
  // Match by parcel number or address
  const listingHistory = await UnifiedClosedListing.find({
    $or: [
      { parcelNumber: contact.property.parcelNumber },
      {
        unparsedAddress: new RegExp(contact.propertyAddress.street, 'i'),
        city: contact.propertyAddress.city
      }
    ]
  }).sort({ closeDate: -1 });

  if (listingHistory.length > 0) {
    const lastSale = listingHistory[0];

    contact.enrichment = {
      hasListingHistory: true,
      lastSaleDate: lastSale.closeDate,
      lastSalePrice: lastSale.closePrice,
      listingPhotos: lastSale.photos || [],
      priceHistory: listingHistory.map(sale => ({
        date: sale.closeDate,
        price: sale.closePrice,
        type: 'sale'
      }))
    };

    // If current ownership purchase price differs from last listing sale price
    if (contact.ownership.purchasePrice &&
        Math.abs(contact.ownership.purchasePrice - lastSale.closePrice) > 50000) {
      contact.leadReasons.push("Price Mismatch - Verify");
    }
  }

  return contact;
}
```

### Phase 3: Map Visualization (Planned)
Use MapLibre + geolocation data to display:

```typescript
<ContactMapView
  contact={contact}
  showNearbyListings={true}
  showNearbyClosedSales={true}
  radius={0.5} // miles
/>
```

**Features**:
- Property pin with photo overlay
- Nearby active listings (green pins)
- Nearby closed sales (blue pins)
- Draw radius around property for neighborhood context

### Phase 4: Contact Card Enhancement (Planned)

```tsx
<ContactCard contact={enrichedContact}>
  {/* Standard contact info */}
  <ContactInfo />

  {/* Property details section */}
  <PropertyDetails>
    <PropertyStats
      beds={contact.property.bedrooms}
      baths={contact.property.bathrooms}
      sqft={contact.property.buildingSize}
      yearBuilt={contact.property.yearBuilt}
      pool={contact.property.pool}
    />

    {/* Show photos from past listings */}
    {contact.enrichment?.listingPhotos && (
      <PropertyPhotoGallery photos={contact.enrichment.listingPhotos} />
    )}
  </PropertyDetails>

  {/* Map view with nearby context */}
  <PropertyMap
    latitude={contact.propertyAddress.latitude}
    longitude={contact.propertyAddress.longitude}
    nearbyListings={contact.enrichment?.nearbyListings}
  />

  {/* Price history chart */}
  {contact.enrichment?.priceHistory && (
    <PriceHistoryChart data={contact.enrichment.priceHistory} />
  )}

  {/* Lead insights */}
  <LeadInsights
    score={contact.leadScore}
    reasons={contact.leadReasons}
    isAbsenteeOwner={!contact.ownership.ownerOccupied}
  />
</ContactCard>
```

## Drop Cowboy Integration

### Multi-Number Campaigns
```typescript
// Send to all phone numbers for maximum reach
async function sendDropCowboyCampaign(contact: EnrichedContact, campaignId: string) {
  const phoneNumbers = contact.phones
    .filter(p => p.type === "Mobile" || p.type === "Landline")
    .map(p => p.number);

  // Drop Cowboy allows batch sends
  await dropCowboyAPI.send({
    campaignId,
    recipients: phoneNumbers,
    metadata: {
      contactId: contact._id,
      propertyAddress: contact.propertyAddress.street,
      absenteeOwner: !contact.ownership.ownerOccupied
    }
  });
}
```

### Personalized Messaging
Use property data for personalized voicemail scripts:

```typescript
const script = `Hi ${contact.firstName}, this is Joseph from eXp Realty.
I noticed you own the beautiful ${contact.property.bedrooms} bedroom home
at ${contact.propertyAddress.street} in ${contact.propertyAddress.city}.
${contact.property.pool ? "Love the pool!" : ""}
I'm actively working in the ${subdivision} neighborhood and would love to
discuss current market opportunities. Give me a call at 555-1234.`;
```

## Lead Scoring Algorithm

```typescript
function calculateLeadScore(contact: EnrichedContact): number {
  let score = 0;

  // Absentee owner (high value)
  if (!contact.ownership.ownerOccupied) score += 25;

  // Recently purchased (likely not selling soon)
  const purchaseDate = new Date(contact.ownership.purchaseDate);
  const monthsSincePurchase =
    (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSincePurchase < 12) score -= 15;
  if (monthsSincePurchase > 60) score += 20; // 5+ years, may be ready to sell

  // High-value property
  if (contact.ownership.assessedValue > 1000000) score += 15;

  // Has listing history (familiar with selling process)
  if (contact.enrichment?.hasListingHistory) score += 10;

  // Multiple phone numbers (easier to reach)
  score += contact.phones.length * 2;

  // Property features (aspirational buyers)
  if (contact.property.pool) score += 5;
  if (contact.property.view) score += 5;

  contact.leadScore = Math.max(0, Math.min(100, score));
  return contact.leadScore;
}
```

## Implementation Checklist

### ✅ Phase 1 - Current (Completed)
- [x] CSV parsing with all fields preserved
- [x] Smart name parsing from "All Owners"
- [x] Multiple phone number extraction
- [x] Absentee owner detection
- [x] Geolocation storage
- [x] Property metadata storage
- [x] Field mapping UI

### 📋 Phase 2 - Property Enrichment (Planned)
- [ ] Update Contact model with enrichment fields
- [ ] Create property cross-reference service
- [ ] Match contacts with unified_listings by APN/address
- [ ] Extract listing photos for contact cards
- [ ] Build price history tracking
- [ ] Implement lead scoring algorithm

### 📋 Phase 3 - Visual Enhancements (Planned)
- [ ] Contact card property details section
- [ ] MapLibre integration for property location
- [ ] Nearby listings map view
- [ ] Property photo gallery component
- [ ] Price history chart component

### 📋 Phase 4 - Campaign Optimization (Planned)
- [ ] Multi-number Drop Cowboy campaigns
- [ ] Personalized voicemail scripts with property data
- [ ] Absentee owner targeting filters
- [ ] Lead score-based campaign prioritization

## Database Schema Updates

### Migration Script (Proposed)
```typescript
// Add enrichment fields to existing contacts
db.contacts.updateMany(
  {},
  {
    $set: {
      phones: [],
      propertyAddress: {},
      mailingAddress: null,
      property: {},
      ownership: {},
      enrichment: null,
      leadScore: 0,
      leadReasons: [],
      customFields: {}
    }
  }
);

// Create indexes for efficient querying
db.contacts.createIndex({ "propertyAddress.latitude": 1, "propertyAddress.longitude": 1 });
db.contacts.createIndex({ "property.parcelNumber": 1 });
db.contacts.createIndex({ "ownership.ownerOccupied": 1 });
db.contacts.createIndex({ leadScore: -1 });
```

## Future Enhancements

1. **Automated Property Monitoring**: Track when properties go on market, price changes, sales
2. **Neighborhood Insights**: Aggregate stats by subdivision for market reports
3. **Equity Estimation**: Calculate potential equity based on purchase price vs current market value
4. **AI-Powered Outreach**: Generate personalized messages based on property characteristics
5. **Photo-Based Valuation**: Use listing photos to estimate property condition and value

---

**Last Updated**: 2026-01-08
**Status**: Phase 1 Complete, Phase 2-4 Planned
