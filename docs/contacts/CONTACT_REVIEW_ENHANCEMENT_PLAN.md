# Contact Review Enhancement Implementation Plan

## Overview
Enhance the contact import review interface with property visualization and comparable sales analysis.

## Features to Implement

### 1. Label Input for Contact Batches
- **Location**: ContactSyncModal upload step
- **Functionality**: Auto-extract from filename (e.g., "Old_Town_247---1.csv" → "Old Town 247")
- **UI**: Editable text input on map step
- **Data Flow**: Pass label to import API, attach to all contacts in batch

### 2. Enhanced Contact Review Cards
**Current State**: Basic contact info display
**New State**: Comprehensive property profile

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ HEADER: Confidence + Issues             │
├─────────────────────────────────────────┤
│ LEFT COLUMN (60%)                       │
│ ├─ Contact Info Section                │
│ ├─ Property Details Section             │
│ └─ Address & Location                   │
├─────────────────────────────────────────┤
│ RIGHT COLUMN (40%)                      │
│ ├─ Property Map (if lat/long exists)   │
│ └─ Comparable Sales (within 1 mile)    │
└─────────────────────────────────────────┘
```

### 3. Property Map Component
- **Library**: react-leaflet
- **Display**: Interactive map centered on property
- **Marker**: Property location pin
- **Fallback**: Hide if no lat/long data

### 4. Comparable Sales API
**Endpoint**: `/api/crm/contacts/comparable-sales`

**Query Parameters**:
- `latitude` (required)
- `longitude` (required)
- `propertyType` (optional)
- `beds` (optional)
- `baths` (optional)
- `radius` (default: 1 mile = 1609 meters)

**MongoDB Query**:
```javascript
UnifiedClosedListing.find({
  coordinates: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 1609 // meters
    }
  },
  propertyType: contactPropertyType,
  bedroomsTotal: { $gte: beds - 1, $lte: beds + 1 },
  closeDate: { $gte: oneYearAgo }
})
.sort({ closeDate: -1 })
.limit(5)
```

**Response**:
```typescript
{
  success: true,
  comparables: [
    {
      address: string,
      closePrice: number,
      closeDate: Date,
      beds: number,
      baths: number,
      sqft: number,
      pricePerSqft: number,
      distance: number, // miles
      daysOnMarket: number,
      primaryPhotoUrl?: string
    }
  ]
}
```

### 5. Component Structure

**New Components**:
1. `PropertyMap.tsx` - Leaflet map showing property location
2. `ComparableSales.tsx` - List of similar sold properties
3. `PropertyDetails.tsx` - Formatted property data display

**Modified Components**:
1. `ContactReviewSwipe.tsx` - Enhanced 2-column layout with map/comps
2. `ContactSyncModal.tsx` - Add label input UI

## Implementation Steps

### Phase 1: Label Input ✓
- [x] Add `contactLabel` state to ContactSyncModal
- [x] Add `extractLabelFromFilename` helper
- [ ] Add label input UI to map step
- [ ] Pass label to import API
- [ ] Store label in contact documents

### Phase 2: Comparable Sales API
- [ ] Create `/api/crm/contacts/comparable-sales/route.ts`
- [ ] Implement geospatial query using unified_closed_listings
- [ ] Add distance calculation
- [ ] Add property type and bed/bath filtering

### Phase 3: Map Component
- [ ] Check/install react-leaflet and leaflet
- [ ] Create PropertyMap component
- [ ] Add CSS for leaflet styles
- [ ] Handle missing coordinates gracefully

### Phase 4: Enhanced Contact Review
- [ ] Create ComparableSales component
- [ ] Redesign ContactReviewSwipe with 2-column layout
- [ ] Fetch comparable sales on card mount
- [ ] Add conditional rendering (only show map/comps if lat/long exists)
- [ ] Improve styling and visual hierarchy

## Database Schema Changes
None required - using existing fields.

## Dependencies
```json
{
  "react-leaflet": "^4.x",
  "leaflet": "^1.9.x"
}
```

## Testing Checklist
- [ ] Label auto-extraction from various filename formats
- [ ] Map displays correctly with valid lat/long
- [ ] Map hidden when no coordinates
- [ ] Comparable sales API returns relevant properties
- [ ] Comparable sales hidden when no lat/long
- [ ] Distance calculation accurate
- [ ] Contact data displays all property fields
- [ ] Swipe gestures still work
- [ ] Edit mode still functional
