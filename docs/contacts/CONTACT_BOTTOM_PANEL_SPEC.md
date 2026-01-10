# Contact Review Bottom Panel - Implementation Specification

## Overview
Replace the swipe-based review with a list-based interface that opens a rich bottom panel when clicking a contact. This follows the same UX pattern as the listing detail panels.

## Current vs. New Flow

### Current (Swipe Cards)
```
Upload → Map Columns → Review (Swipe Cards) → Import
                         ↓
                    [Card 1 of 10]
                    Full contact data
                    Swipe left/right
```

### New (List + Bottom Panel)
```
Upload → Map Columns → Review (List View) → Import
                         ↓
                    ┌─────────────────────┐
                    │ Contact 1           │ ← Click opens panel
                    │ Contact 2  [!]      │
                    │ Contact 3           │
                    └─────────────────────┘
                         ↓
                    [Bottom Panel Slides Up]
                    Rich contact card with property data
```

## Components to Create/Modify

### 1. ContactReviewList.tsx (NEW)
Replace `ContactReviewSwipe.tsx` with a list-based interface.

**Purpose**: Display all contacts needing review in a scrollable list

**Props**:
```typescript
interface ContactReviewListProps {
  contacts: ReviewContact[];
  isLight: boolean;
  onComplete: (decisions: Map<number, 'keep' | 'skip'>, editedContacts: Map<number, any>) => void;
  onBack: () => void;
  contactLabel?: string; // Label to apply to kept contacts
}
```

**Features**:
- Scrollable list of all contacts (not one-at-a-time)
- Each item shows:
  - Name (firstName + lastName)
  - Phone number (primary)
  - Property address
  - Confidence badge
  - Issue count badge
  - Quick action buttons (Keep/Skip)
- Click anywhere on row → Opens bottom panel
- Bulk actions: "Keep All", "Skip All"
- Progress indicator: "5 of 10 reviewed"

**Layout**:
```
┌────────────────────────────────────────────────┐
│ Review Contacts (10)              [✓ Keep All] │
├────────────────────────────────────────────────┤
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ John Doe                    [Keep][Skip]│  │ ← Reviewed
│ │   (760) 555-1234                          │  │
│ │   123 Main St                             │  │
│ │   🟡 70% • 2 issues                       │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ Jane Smith                    [Keep][Skip]│  │ ← Click to review
│ │   (760) 555-5678                          │  │
│ │   456 Oak Ave                             │  │
│ │   🔴 45% • 3 issues                       │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ [Scrollable list...]                            │
└────────────────────────────────────────────────┘
```

### 2. ContactDetailPanel.tsx (NEW)
Bottom sliding panel showing full contact and property details.

**Purpose**: Rich contact card with property visualization and comparable sales

**Props**:
```typescript
interface ContactDetailPanelProps {
  contact: ReviewContact;
  isOpen: boolean;
  onClose: () => void;
  onKeep: () => void;
  onSkip: () => void;
  onEdit: (updatedData: any) => void;
  isLight: boolean;
}
```

**Features**:
- Slides up from bottom (like ListingBottomPanel)
- Drag handle to close
- Fixed action bar at bottom with Keep/Skip/Edit buttons
- Scrollable content area
- Sections:
  1. **Header** - Name, confidence, issues
  2. **Contact Info** - Phone(s), Email(s)
  3. **Property Details** - Beds, Baths, Sqft, Year Built, etc.
  4. **Location** - Address + Interactive Map
  5. **Comparable Sales** - Similar properties sold nearby
  6. **Raw Data** - All additional fields

**Layout**:
```
┌────────────────────────────────────────────────┐
│            [─────]  Drag Handle                │
├────────────────────────────────────────────────┤
│                                                 │
│  HEADER                                         │
│  ┌──────────────────────────────────────────┐ │
│  │ John Doe                    🟡 70% • 2❗ │ │
│  │ Issues:                                   │ │
│  │ • Missing email                           │ │
│  │ • Missing last name                       │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  CONTACT INFORMATION                            │
│  ┌──────────────────────────────────────────┐ │
│  │ 📞 Phone                                  │ │
│  │    (760) 555-1234  [Primary]             │ │
│  │    (760) 555-5678  [Mobile]              │ │
│  │                                           │ │
│  │ ✉️  Email                                  │ │
│  │    john@example.com                       │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  PROPERTY DETAILS                               │
│  ┌──────────────────────────────────────────┐ │
│  │ 🏠 Residential Property                   │ │
│  │                                           │ │
│  │ 🛏️  4 Beds  •  🛁 3 Baths  •  📐 2,346 SF │ │
│  │ 📅 Built 1998  •  🅿️ 2 Car Garage         │ │
│  │                                           │ │
│  │ APN: 770093004                            │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  LOCATION & MAP                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ 📍 78743 Avenida Tujunga                 │ │
│  │    La Quinta, CA 92253                    │ │
│  │                                           │ │
│  │  [Interactive Map - 300px height]         │ │
│  │  • Property marker                        │ │
│  │  • Nearby comparable sales markers        │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  COMPARABLE SALES (Within 1 mile)              │
│  ┌──────────────────────────────────────────┐ │
│  │ Similar properties sold recently:         │ │
│  │                                           │ │
│  │ 📸 50630 Calle Guaymas                   │ │
│  │    $744,000 • Dec 2023                    │ │
│  │    4 bed, 3 bath • 3,548 SF               │ │
│  │    0.2 mi away • $210/SF                  │ │
│  ├───────────────────────────────────────────┤ │
│  │ 📸 50700 Calle Guaymas                   │ │
│  │    $650,000 • Nov 2023                    │ │
│  │    3 bed, 2 bath • 2,502 SF               │ │
│  │    0.1 mi away • $260/SF                  │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  [More sections: Purchase History, etc.]       │
│                                                 │
├────────────────────────────────────────────────┤
│  ACTIONS (Fixed Bottom Bar)                    │
│  ┌──────────────────────────────────────────┐ │
│  │  [✏️ Edit]   [✓ Keep]   [✕ Skip]         │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### 3. PropertyMap.tsx (NEW)
Reusable map component for displaying property location.

**Props**:
```typescript
interface PropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  comparables?: {
    latitude: number;
    longitude: number;
    address: string;
    closePrice: number;
  }[];
  height?: string; // Default: '300px'
  isLight: boolean;
}
```

**Features**:
- Uses react-leaflet
- Main property marker (blue pin)
- Comparable sales markers (green pins)
- Popup on marker hover showing address/price
- Auto-fit bounds to show all markers
- Zoom controls
- Responsive

### 4. ComparableSales.tsx (NEW)
Display list of similar sold properties.

**Props**:
```typescript
interface ComparableSalesProps {
  latitude: number;
  longitude: number;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  isLight: boolean;
}
```

**Features**:
- Fetches data from `/api/crm/contacts/comparable-sales`
- Shows loading state
- Empty state if no comparables found
- Each item shows:
  - Photo (if available)
  - Address
  - Close price + date
  - Beds/Baths/Sqft
  - Distance from subject property
  - Price per sqft
  - Days on market
- Sort by: Distance, Price, Date
- Limit: 5 most relevant

### 5. ContactSyncModal.tsx (MODIFY)
Update to use ContactReviewList instead of ContactReviewSwipe.

**Changes**:
```typescript
// OLD
case 'review':
  return <ContactReviewSwipe ... />;

// NEW
case 'review':
  return <ContactReviewList
    contacts={reviewContacts}
    isLight={isLight}
    onComplete={(decisions, edited) => {
      setReviewDecisions(decisions);
      setEditedContacts(edited);
      handleConfirmImport();
    }}
    onBack={() => setCurrentStep('map')}
    contactLabel={contactLabel}
  />;
```

## API Endpoints

### GET /api/crm/contacts/comparable-sales
Fetch comparable sales from unified_closed_listings.

**Query Parameters**:
```typescript
{
  latitude: number;     // Required
  longitude: number;    // Required
  propertyType?: string; // Optional filter
  beds?: number;        // Optional (will search ±1)
  baths?: number;       // Optional (will search ±0.5)
  sqft?: number;        // Optional (will search ±20%)
  radius?: number;      // Default: 1 mile (1609 meters)
  limit?: number;       // Default: 5
}
```

**Response**:
```typescript
{
  success: true,
  comparables: [
    {
      listingKey: string;
      address: string;
      city: string;
      closePrice: number;
      closeDate: string; // ISO date
      bedroomsTotal: number;
      bathroomsTotalDecimal: number;
      livingArea: number; // sqft
      pricePerSqft: number; // calculated
      distance: number; // miles, calculated
      daysOnMarket: number;
      primaryPhotoUrl?: string;
      latitude: number;
      longitude: number;
      propertyType: string;
    }
  ],
  count: number
}
```

**MongoDB Query**:
```javascript
const radiusInMeters = (radius || 1) * 1609; // miles to meters

const comparables = await UnifiedClosedListing.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      distanceField: "distanceInMeters",
      maxDistance: radiusInMeters,
      spherical: true,
      query: {
        // Filter by property type if provided
        ...(propertyType && { propertyType }),
        // Filter by beds (±1)
        ...(beds && {
          bedroomsTotal: { $gte: beds - 1, $lte: beds + 1 }
        }),
        // Filter by baths (±0.5)
        ...(baths && {
          bathroomsTotalDecimal: { $gte: baths - 0.5, $lte: baths + 1 }
        }),
        // Only last 2 years
        closeDate: { $gte: twoYearsAgo }
      }
    }
  },
  {
    $addFields: {
      // Convert meters to miles
      distance: { $divide: ["$distanceInMeters", 1609] },
      // Calculate price per sqft
      pricePerSqft: {
        $cond: {
          if: { $gt: ["$livingArea", 0] },
          then: { $divide: ["$closePrice", "$livingArea"] },
          else: null
        }
      }
    }
  },
  {
    $sort: { distanceInMeters: 1 }
  },
  {
    $limit: limit || 5
  },
  {
    $project: {
      listingKey: 1,
      address: 1,
      city: 1,
      closePrice: 1,
      closeDate: 1,
      bedroomsTotal: 1,
      bathroomsTotalDecimal: 1,
      livingArea: 1,
      daysOnMarket: 1,
      primaryPhotoUrl: 1,
      latitude: 1,
      longitude: 1,
      propertyType: 1,
      distance: 1,
      pricePerSqft: 1
    }
  }
]);
```

## State Management

### ContactReviewList State
```typescript
const [contacts, setContacts] = useState<ReviewContact[]>(initialContacts);
const [selectedContact, setSelectedContact] = useState<ReviewContact | null>(null);
const [isPanelOpen, setIsPanelOpen] = useState(false);
const [decisions, setDecisions] = useState<Map<number, 'keep' | 'skip'>>(new Map());
const [editedContacts, setEditedContacts] = useState<Map<number, any>>(new Map());
```

### Event Handlers
```typescript
// Open panel
const handleContactClick = (contact: ReviewContact) => {
  setSelectedContact(contact);
  setIsPanelOpen(true);
};

// Keep contact
const handleKeep = () => {
  if (!selectedContact) return;
  const newDecisions = new Map(decisions);
  newDecisions.set(selectedContact.rowIndex, 'keep');
  setDecisions(newDecisions);
  closePanel();
};

// Skip contact
const handleSkip = () => {
  if (!selectedContact) return;
  const newDecisions = new Map(decisions);
  newDecisions.set(selectedContact.rowIndex, 'skip');
  setDecisions(newDecisions);
  closePanel();
};

// Edit contact
const handleEdit = (updatedData: any) => {
  if (!selectedContact) return;
  const newEdited = new Map(editedContacts);
  newEdited.set(selectedContact.rowIndex, updatedData);
  setEditedContacts(newEdited);

  // Update the contact in the list
  setContacts(contacts.map(c =>
    c.rowIndex === selectedContact.rowIndex
      ? { ...c, data: updatedData }
      : c
  ));
};

// Complete review
const handleComplete = () => {
  // Check if all contacts have been reviewed
  const unreviewed = contacts.filter(c => !decisions.has(c.rowIndex));

  if (unreviewed.length > 0) {
    // Show warning or auto-keep remaining
    confirm("You have unreviewed contacts. Keep all remaining?");
  }

  onComplete(decisions, editedContacts);
};
```

## Label/Tag Implementation

### Where to Add Label Input
**Location**: Map step (after column mapping, before review)

**UI**:
```
┌────────────────────────────────────────────────┐
│ Map Columns                                     │
├────────────────────────────────────────────────┤
│                                                 │
│  [Column mapping interface]                     │
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ 📝 Label for this batch:                 │ │
│  │                                           │ │
│  │ [Old Town 247              ] [✏️]         │ │
│  │                                           │ │
│  │ This label will be applied to all kept   │ │
│  │ contacts from this import.                │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  [Back]                        [Next: Review →] │
└────────────────────────────────────────────────┘
```

### Data Flow
```
1. Upload CSV → Auto-extract label from filename
2. Map step → Show label input (pre-filled), allow edit
3. Review step → Display label in header
4. Import → Attach label to all kept contacts
```

### Backend Changes
In `/api/crm/contacts/import/confirm/route.ts`:

```typescript
// Add label to each contact being imported
const contactsToImport = validContacts.map(contact => ({
  ...contact,
  labels: contactLabel ? [contactLabel] : []
}));
```

## Dependencies

### Install Required Packages
```bash
npm install react-leaflet leaflet
npm install --save-dev @types/leaflet
```

### Add CSS
In `app/globals.css` or component:
```css
@import 'leaflet/dist/leaflet.css';
```

### Fix Leaflet Icon Issue (Common in Next.js)
```typescript
// In PropertyMap.tsx
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
```

## Responsive Design

### Desktop (≥1024px)
- Bottom panel takes 60% of screen height
- Map shown at full width (300px height)
- Comparable sales in grid (2 columns)

### Tablet (768px - 1023px)
- Bottom panel takes 70% of screen height
- Map shown at full width (250px height)
- Comparable sales in single column

### Mobile (<768px)
- Bottom panel takes 85% of screen height
- Map shown at full width (200px height)
- Comparable sales in single column
- Simplified contact list items

## Testing Checklist

### Contact List View
- [ ] All contacts display with correct data
- [ ] Confidence badges show correct color
- [ ] Issue counts accurate
- [ ] Click opens bottom panel
- [ ] Keep/Skip buttons work inline
- [ ] Bulk actions work
- [ ] Progress indicator updates

### Bottom Panel
- [ ] Slides up smoothly
- [ ] Drag to close works
- [ ] All contact data displays
- [ ] Property details formatted correctly
- [ ] Map loads and shows marker
- [ ] Comparable sales fetch and display
- [ ] Edit mode works
- [ ] Keep/Skip actions work
- [ ] Panel closes after action

### Map Component
- [ ] Displays property location
- [ ] Comparable markers show
- [ ] Popups work on hover
- [ ] Zoom/pan functional
- [ ] Auto-fits to show all markers
- [ ] Hidden when no coordinates

### Comparable Sales
- [ ] API returns relevant properties
- [ ] Distance calculation accurate
- [ ] Price per sqft calculated
- [ ] Empty state handles gracefully
- [ ] Loading state shows
- [ ] Sort functionality works

### Label Feature
- [ ] Auto-extracts from filename
- [ ] Editable on map step
- [ ] Displays in review header
- [ ] Attached to imported contacts
- [ ] Works with bulk import

## Performance Considerations

1. **Map Loading**: Lazy load react-leaflet to reduce initial bundle
2. **Comparable Sales**: Cache results per lat/long
3. **Bottom Panel**: Use CSS transforms for smooth animation
4. **Contact List**: Virtual scrolling if > 100 contacts
5. **Images**: Lazy load comparable property photos

## File Structure
```
src/
├── app/
│   ├── api/
│   │   └── crm/
│   │       └── contacts/
│   │           └── comparable-sales/
│   │               └── route.ts (NEW)
│   └── components/
│       └── crm/
│           ├── ContactReviewList.tsx (NEW)
│           ├── ContactDetailPanel.tsx (NEW)
│           ├── PropertyMap.tsx (NEW)
│           ├── ComparableSales.tsx (NEW)
│           ├── ContactSyncModal.tsx (MODIFY)
│           └── ContactReviewSwipe.tsx (DELETE or keep as fallback)
└── docs/
    └── contacts/
        └── CONTACT_BOTTOM_PANEL_SPEC.md (THIS FILE)
```

## Migration Notes

### Breaking Changes
- `ContactReviewSwipe` replaced with `ContactReviewList`
- Review flow changes from one-at-a-time to list view
- Users can now review contacts in any order

### Backwards Compatibility
- Can keep `ContactReviewSwipe` as fallback
- Add feature flag to toggle between old/new experience
- Both use same data structures

## Future Enhancements

1. **Batch Actions**: Select multiple contacts, bulk keep/skip
2. **Filters**: Filter by issue type, confidence level
3. **Search**: Search contacts by name/address in review list
4. **Property Valuation**: Show estimated value based on comps
5. **AI Suggestions**: "This contact matches 3 active campaigns"
6. **Duplicate Detection**: Highlight potential duplicates in real-time
7. **Smart Sorting**: Sort by likelihood of being a good lead

## Questions for Implementation

Before starting, confirm:
1. Should we completely replace swipe interface or offer both?
2. What zoom level for maps (neighborhood vs street level)?
3. Show all property fields or curate "most important"?
4. Allow creating new labels or only use existing ones?
5. Should comparable sales refresh live or cached?
6. Maximum number of contacts to show in list (pagination)?

---

**Status**: Ready for implementation
**Estimated Effort**: 2-3 days
**Priority**: High
**Dependencies**: react-leaflet, unified_closed_listings data
