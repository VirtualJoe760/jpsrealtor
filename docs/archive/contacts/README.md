# Contact Import Enhancement Documentation

## Overview
This directory contains specifications for enhancing the contact import and review experience with rich property data visualization.

## Documents

### 1. [CONTACT_BOTTOM_PANEL_SPEC.md](./CONTACT_BOTTOM_PANEL_SPEC.md)
**Status**: ✅ Ready for Implementation
**Priority**: High

Complete specification for redesigning the contact review interface with:
- List-based review (replacing swipe cards)
- Bottom sliding panel with rich contact details
- Interactive property maps
- Comparable sales analysis
- Label/tag management

**Key Features**:
- Click contact → Opens detailed panel (like listing panels)
- Property location on interactive map
- Nearby comparable sales from MLS
- All property data fields displayed
- Keep/Skip/Edit actions

### 2. [CONTACT_REVIEW_ENHANCEMENT_PLAN.md](./CONTACT_REVIEW_ENHANCEMENT_PLAN.md)
**Status**: ⚠️ Superseded by Bottom Panel Spec
**Priority**: Reference Only

Original enhancement plan with swipe-based approach. Kept for reference but replaced by the superior bottom panel UX.

## Implementation Order

Follow this sequence for implementation:

### Phase 1: Foundation (Day 1)
1. Add label/tag input to ContactSyncModal
2. Auto-extract label from filename
3. Create comparable sales API endpoint
4. Install react-leaflet dependencies

### Phase 2: Components (Day 2)
1. Create PropertyMap component
2. Create ComparableSales component
3. Create ContactDetailPanel component
4. Create ContactReviewList component

### Phase 3: Integration (Day 3)
1. Wire up ContactReviewList to ContactSyncModal
2. Connect comparable sales API to panel
3. Test label flow end-to-end
4. Polish animations and transitions

### Phase 4: Testing & Refinement
1. Test with various CSV formats
2. Verify map displays correctly
3. Test comparable sales accuracy
4. Mobile responsive testing
5. Performance optimization

## Quick Start

### For Developers
1. Read [CONTACT_BOTTOM_PANEL_SPEC.md](./CONTACT_BOTTOM_PANEL_SPEC.md)
2. Install dependencies: `npm install react-leaflet leaflet @types/leaflet`
3. Start with comparable sales API (`/api/crm/contacts/comparable-sales`)
4. Build components in order: Map → Comps → Panel → List
5. Integrate with ContactSyncModal

### For Product/Design
- Review mockups in CONTACT_BOTTOM_PANEL_SPEC.md
- Key UX change: Swipe cards → List with bottom panel
- Maps require valid lat/long in contact data
- Comparable sales require unified_closed_listings data

## Data Requirements

### Contact Data Fields
For full experience, contacts should have:
- **Required**: firstName, lastName, phone
- **Enhanced**: latitude, longitude, beds, baths, sqft, propertyType
- **Optional**: address, apn, yearBuilt, lotSize, etc.

### MLS Data
- unified_closed_listings collection must be populated
- Requires 2dsphere index on coordinates field
- Properties should have closeDate within last 2 years

## Dependencies

```json
{
  "react-leaflet": "^4.x",
  "leaflet": "^1.9.x",
  "@types/leaflet": "^1.9.x"
}
```

## API Endpoints

### New
- `GET /api/crm/contacts/comparable-sales` - Fetch nearby sold properties

### Modified
- `POST /api/crm/contacts/import/confirm` - Now accepts `label` parameter

## Component Hierarchy

```
ContactSyncModal
└── renderContent()
    └── case 'review':
        └── ContactReviewList
            ├── [Contact List Items]
            │   ├── Name, Phone, Address
            │   ├── Confidence Badge
            │   └── Quick Actions
            └── ContactDetailPanel (when contact clicked)
                ├── Header (Name, Issues)
                ├── Contact Info Section
                ├── Property Details Section
                ├── PropertyMap
                │   └── Leaflet Map + Markers
                ├── ComparableSales
                │   └── List of nearby sales
                └── Action Buttons (Keep/Skip/Edit)
```

## Feature Flags

Consider adding feature flags for gradual rollout:

```typescript
const FEATURE_FLAGS = {
  USE_BOTTOM_PANEL: true, // vs swipe cards
  SHOW_COMPARABLE_SALES: true,
  SHOW_PROPERTY_MAP: true,
  ENABLE_CONTACT_LABELS: true
};
```

## Performance Metrics

Track these metrics post-implementation:
- Time to review all contacts (should decrease)
- Percentage of contacts kept vs skipped
- Label usage rate
- Comparable sales fetch time
- Map load time
- Overall import completion rate

## Known Limitations

1. **Maps**: Require valid lat/long coordinates
2. **Comparable Sales**: Limited to properties with:
   - Recent close dates (<2 years)
   - Geocoded location data
   - Similar property type
3. **Labels**: Currently single label per contact (can expand)
4. **Mobile**: Map interaction may be limited on small screens

## Future Roadmap

### v2.0 Features
- AI-powered lead scoring
- Automatic duplicate detection
- Batch editing (select multiple contacts)
- Property valuation estimates
- Integration with active campaigns
- Smart label suggestions

### v3.0 Features
- Custom field mapping templates
- Advanced filtering and search
- Comparison view (side-by-side contacts)
- Export reviewed contacts
- Audit trail for decisions

## Support & Questions

For questions during implementation:
1. Check CONTACT_BOTTOM_PANEL_SPEC.md first
2. Review code comments in existing components
3. Test with sample CSV: `docs/contacts/sample-data/old_town_247.csv`
4. Verify MLS data availability in unified_closed_listings

## Related Documentation

- Contact Model: `src/models/contact.ts`
- Unified Closed Listings: `src/models/unified-closed-listing.ts`
- Import Service: `src/lib/services/contact-import.service.ts`
- Column Detection: `src/lib/services/column-detection.service.ts`

---

**Last Updated**: 2026-01-09
**Version**: 1.0
**Status**: Ready for Development
