# Agent 2: Shared Package Extraction

**Runs:** Second (after Agent 1 creates workspace structure)
**Estimated Time:** 1 week

---

## Mission

Extract all framework-agnostic code from the web app into `packages/shared/` so both web and mobile apps can import from a single source of truth. This includes TypeScript types, utility functions, constants, validation, formatting, and business logic.

---

## Scope Overview

| Category | File Count | Notes |
|---|---|---|
| TypeScript types/interfaces | ~50 files | Extract from models, lib, types/ |
| Formatting utilities | 3 files | Phone, price, address formatting |
| Validation | 1 major file + scattered | Contact validation rules |
| Constants | 6+ files | States, city centers, tax rates, platform mappings |
| Business logic | 15+ files | CMA engine, analytics calculations, location matching |
| Geo data | 3 files | City/county/region boundary polygons |

---

## Package Structure

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── listing.ts          # MapListing, ListingData, Photo, StandardFields
│   │   ├── user.ts             # IUser, UserRole
│   │   ├── contact.ts          # IContact, IPhone, IEmail, ContactStatus
│   │   ├── campaign.ts         # ICampaign, CampaignType, CampaignStatus
│   │   ├── campaign-execution.ts
│   │   ├── chat.ts             # ChatMessage, ChatRequest, StreamEvent
│   │   ├── cma.ts              # CMAResult, CMAComp, CMASubject, CMATier
│   │   ├── sms.ts              # SMSMessage, Conversation
│   │   ├── email.ts            # EmailMetadata, EmailFolder
│   │   ├── label.ts            # ILabel
│   │   ├── team.ts             # ITeam
│   │   ├── article.ts          # IArticle
│   │   ├── subdivision.ts      # ISubdivision
│   │   ├── geo.ts              # IGeoPoint, LocationMatch, GeocodingResult
│   │   ├── analytics.ts        # DaysOnMarketStats, PricePerSqftStats, etc.
│   │   ├── map.ts              # MapFilters, ServerCluster, TotalCount
│   │   ├── push.ts             # Push subscription types
│   │   ├── voicemail.ts        # VoicemailScript types
│   │   ├── direct-mail.ts      # DirectMailPiece types
│   │   ├── ad-campaign.ts      # AdCampaignRecord types
│   │   └── index.ts            # Re-exports everything
│   │
│   ├── formatting/
│   │   ├── phone.ts            # formatPhone, toE164US, formatPhoneForDisplay, isValidE164Phone
│   │   ├── price.ts            # formatPrice, parsePrice, formatPriceShort ($1.5m, $450k)
│   │   ├── address.ts          # Address formatting helpers
│   │   ├── date.ts             # Date formatting wrappers (uses date-fns)
│   │   ├── zip.ts              # formatZip
│   │   └── index.ts
│   │
│   ├── validation/
│   │   ├── contact-validators.ts  # VALIDATION_RULES, ValidationRule, ValidationResult
│   │   ├── phone-validation.ts    # E.164 validation, test number detection
│   │   ├── email-validation.ts    # Email format validation
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── us-states.ts        # US_STATES array
│   │   ├── contact-status.ts   # ContactStatus, ContactAge, FilterBy, SortBy enums
│   │   ├── campaign-types.ts   # Campaign type/status constants
│   │   ├── property-types.ts   # Property type constants
│   │   ├── mail-pricing.ts     # MAIL_PRICING from thanksio.ts
│   │   ├── platform-mappings.ts # config/platform-mappings.json
│   │   ├── groq-models.ts      # GROQ_MODELS
│   │   └── index.ts
│   │
│   ├── geo/
│   │   ├── city-centers.ts     # CITY_CENTERS, getCityCenter, getMapCenter
│   │   ├── bounds.ts           # boundsToKey, boundsHaveChanged, getBoundsCenter, etc.
│   │   ├── tile-math.ts        # lngLatToTile, tileToBBOX
│   │   ├── colors.ts           # formatPrice, getActivityColor, boundary colors
│   │   ├── clustering.ts       # applyCenterFocusedClustering, calculateDistance
│   │   └── index.ts
│   │
│   ├── analytics/
│   │   ├── calculations/
│   │   │   ├── appreciation.ts
│   │   │   ├── market-stats.ts    # analyzeDaysOnMarket, price/sqft, HOA, tax
│   │   │   ├── property-tax.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── cma/
│   │   ├── engine.ts           # Main CMA calculation
│   │   ├── scoring.ts          # Property scoring
│   │   ├── remarks-parser.ts   # Parse listing remarks
│   │   ├── attribute-resolver.ts
│   │   ├── subdivision-profile.ts
│   │   ├── tiers.ts            # Market tier classification
│   │   ├── types.ts            # CMA-specific types
│   │   └── index.ts
│   │
│   └── index.ts                # Main entry point
│
├── package.json
└── tsconfig.json
```

---

## Extraction Process (File by File)

### Types to Extract

For each model file, extract the TypeScript interface (NOT the Mongoose schema). The schema stays in the web app's models/ directory.

#### From Model Files (extract interface only)

| Source File | Types to Extract |
|---|---|
| `src/models/unified-listing.ts` | `IUnifiedListing`, `IMedia`, `IOpenHouse`, `IVideo`, `IVirtualTour`, `IDocument`, `IGeoPoint` |
| `src/models/User.ts` | `IUser`, `UserRole` type |
| `src/models/Contact.ts` | `IContact`, `IPhone`, `IEmail` |
| `src/models/Campaign.ts` | `ICampaign`, `CampaignType`, `CampaignStatus` |
| `src/models/CampaignExecution.ts` | `ICampaignExecution`, strategy metrics interfaces |
| `src/models/ContactCampaign.ts` | `IContactCampaign` |
| `src/models/VoicemailScript.ts` | `IVoicemailScript` |
| `src/models/DirectMailPiece.ts` | `IDirectMailPiece` |
| `src/models/AdCampaignRecord.ts` | `IAdCampaignRecord` |
| `src/models/Label.ts` | `ILabel` |
| `src/models/Team.ts` | `ITeam` |
| `src/models/article.ts` | `IArticle` |
| `src/models/subdivisions.ts` | `ISubdivision` |
| `src/models/cities.ts` | `ICity` |
| `src/models/counties.ts` | `ICounty` |
| `src/models/regions.ts` | `IRegion` |
| `src/models/sms-message.ts` | `ISMSMessage` |
| `src/models/email-metadata.ts` | `IEmailMetadata` |
| `src/models/chat-message.ts` | `IChatMessage` |
| `src/models/saved-chat.ts` | `ISavedChat` |
| `src/models/PushSubscription.ts` | `IPushSubscription` |
| `src/models/ImportBatch.ts` | `IImportBatch`, `ImportBatchStatus`, `ContactSource` |
| `src/models/GenerationSession.ts` | `IGenerationSession` |
| `src/models/community-facts.ts` | `ICommunityFacts` |
| `src/models/PointOfInterest.ts` | `IPointOfInterest` |

**Important:** When extracting, remove all `mongoose.Document` extension. Make them plain TypeScript interfaces. Example:

```typescript
// BEFORE (in model file):
export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  // ...
}

// AFTER (in shared types):
export interface IContact {
  _id: string;
  userId: string;
  firstName: string;
  // ...
}
```

Replace `mongoose.Types.ObjectId` with `string` in all shared types.

#### From Type Files (move directly)

| Source | Destination | Types |
|---|---|---|
| `src/types/types.ts` | `shared/types/map.ts` | `MapListing`, `Filters`, `Photo` |
| `src/types/listing.ts` | `shared/types/listing.ts` | `Photo`, `StandardFields`, `ListingData` |
| `src/types/cluster.ts` | `shared/types/map.ts` | `CustomProperties`, cluster features |
| `src/types/hoa.ts` | `shared/types/hoa.ts` | HOA types |
| `src/types/school.ts` | `shared/types/school.ts` | `School` |
| `src/lib/chat-v2/types.ts` | `shared/types/chat.ts` | `ChatMessage`, `ChatRequest`, `StreamEvent`, etc. |
| `src/lib/cma/types.ts` | `shared/cma/types.ts` | All CMA types (CMATier, CMAResult, etc.) |
| `src/app/utils/map/types.ts` | `shared/types/map.ts` | `TotalCount`, `MapFilters`, `LoadedRegion` |

#### From Component Type Directories

| Source | Destination |
|---|---|
| `src/app/components/crm/contacts/types/index.ts` | `shared/types/contact.ts` |
| `src/app/components/crm/contacts/types/enums.ts` | `shared/constants/contact-status.ts` |
| `src/app/components/crm/email-inbox/types/index.ts` | `shared/types/email.ts` |
| `src/app/components/crm/email-inbox/types/enums.ts` | `shared/constants/email-enums.ts` |
| `src/app/agent/messages/types/index.ts` | `shared/types/sms.ts` |
| `src/app/dashboard/utils/types.ts` | `shared/types/favorites.ts` |

---

### Utilities to Extract

These are pure functions with no DOM or framework dependencies:

#### Formatting (move directly)

| Source | Function(s) | Notes |
|---|---|---|
| `src/lib/format-input.ts` | `formatPhone`, `toE164US`, `formatPrice`, `parsePrice`, `formatZip`, `US_STATES` | All pure functions, no deps |
| `src/lib/phoneFormat.ts` | `formatPhoneToE164`, `formatPhoneForDisplay`, `handlePhoneInput`, `isValidE164Phone` | Pure, uses regex |
| `src/app/utils/map/colors.ts` | `formatPrice` (short form: "$1.5m") | Pure math |

#### Validation (move directly)

| Source | Function(s) |
|---|---|
| `src/lib/services/contact-validators.ts` | `VALIDATION_RULES`, validator functions |

#### Geo Utilities (move directly — all pure JS)

| Source | Function(s) | Notes |
|---|---|---|
| `src/app/utils/map/bounds.ts` | `boundsToKey`, `boundsHaveChanged`, `getBoundsCenter`, `expandBounds`, `pointInBounds`, etc. | Pure math, no DOM |
| `src/app/utils/map/tileMath.ts` | `lngLatToTile`, `tileToBBOX` | Pure math |
| `src/app/utils/map/colors.ts` | `getActivityColor`, `colorWithOpacity`, `getBoundaryColor`, `BOUNDARY_COLORS` | Pure, color calculations |
| `src/app/utils/map/center-focused-clustering.ts` | `calculateViewportCenter`, `calculateDistance`, `applyCenterFocusedClustering` | Pure algorithms |
| `src/lib/geo-centers.ts` | `CITY_CENTERS`, `getCityCenter`, `getMapCenter` | Pure data + lookups |

#### Analytics Calculations (move directly — framework-agnostic)

| Source | Function(s) |
|---|---|
| `src/lib/analytics/calculations/appreciation.ts` | Appreciation calculations |
| `src/lib/analytics/calculations/market-stats.ts` | `analyzeDaysOnMarket`, price/sqft, HOA, tax analysis |
| `src/lib/analytics/calculations/property-tax-enhanced.ts` | Property tax calculations |

#### CMA Engine (move directly — pure business logic)

| Source | Notes |
|---|---|
| `src/lib/cma/engine.ts` | Main CMA calculation — pure functions |
| `src/lib/cma/scoring.ts` | Property scoring — pure |
| `src/lib/cma/remarks-parser.ts` | Listing remarks parsing — pure |
| `src/lib/cma/attribute-resolver.ts` | Attribute resolution — pure |
| `src/lib/cma/subdivision-profile.ts` | Subdivision profiling — pure |
| `src/lib/cma/tiers.ts` | Market tier classification — pure |

**Warning:** Some CMA files may import Mongoose models for database queries. Those imports must be removed — the shared package should only contain pure calculation logic. Database access stays in the web app's API routes.

#### Contact Utilities (move directly)

| Source | Function(s) |
|---|---|
| `src/app/components/crm/contacts/utils/contactUtils.ts` | `getContactDisplayName`, `getContactInitials`, `formatPhoneNumber`, `hasEmail`, `hasPhone`, `hasAddress`, `getDaysSinceImport`, `getContactAgeCategory` |
| `src/app/components/crm/contacts/utils/filterUtils.ts` | `filterContact`, `filterContacts` |
| `src/app/components/crm/contacts/utils/sortUtils.ts` | `sortContacts`, `getSortComparator` |
| `src/lib/utils/contact-cleaning.utils.ts` | Contact cleaning utilities |

---

### Constants to Extract

| Source | Constant(s) |
|---|---|
| `src/lib/format-input.ts` | `US_STATES` |
| `src/lib/geo-centers.ts` | `CITY_CENTERS` |
| `src/lib/services/property-tax-rates.ts` | `COUNTY_TAX_RATE_FALLBACKS` |
| `src/lib/thanksio.ts` | `MAIL_PRICING`, `MailType` |
| `src/lib/groq.ts` | `GROQ_MODELS` |
| `src/config/platform-mappings.json` | Platform field mappings |

---

### Geo Data Files

These are large static data files. Move to shared:

| Source | Size | Notes |
|---|---|---|
| `src/data/city-boundaries.ts` | 41KB+ | 483 California city polygons |
| `src/data/county-boundaries.ts` | ~20KB | County polygons |
| `src/data/region-boundaries.ts` | ~10KB | Region polygons |

---

## What Stays in Web App (DO NOT Extract)

- Mongoose model schemas (the `new Schema({...})` definitions)
- API route handlers
- Next.js specific code (middleware, server components, `generateMetadata`)
- React components
- Hooks that use DOM APIs (`window`, `document`, `localStorage`)
- `src/lib/auth.ts` (NextAuth config)
- `src/lib/mongodb.ts`, `src/lib/mongoose.ts` (database connections)
- `src/lib/email.ts`, `src/lib/email-resend.ts` (server-side email sending)
- `src/lib/twilio.ts` (server-side SMS)
- `src/lib/cloudinary.ts` (server-side image upload)
- `src/lib/vps-ssh.ts` (SSH connections)
- `src/lib/meta-pixel.ts` (browser-specific pixel tracking)
- Service worker files

---

## Post-Extraction: Update Web App Imports

After extracting to shared, update the web app to import from `@jpsrealtor/shared` instead of the original locations:

```typescript
// BEFORE:
import { MapListing } from '@/types/types';
import { formatPrice } from '@/lib/format-input';
import { boundsToKey } from '@/app/utils/map/bounds';

// AFTER:
import { MapListing } from '@jpsrealtor/shared/types';
import { formatPrice } from '@jpsrealtor/shared/formatting';
import { boundsToKey } from '@jpsrealtor/shared/geo';
```

**Critical:** Run TypeScript compiler after each batch of changes to catch broken imports. Do NOT remove original files until all imports are updated and compiling.

---

## Deliverables Checklist

- [ ] `packages/shared/` directory with full structure
- [ ] All TypeScript interfaces extracted (Mongoose-free versions)
- [ ] All formatting utilities moved and tested
- [ ] All validation rules moved
- [ ] All constants extracted
- [ ] All geo utilities moved (bounds, tiles, clustering, colors)
- [ ] CMA engine extracted (pure logic only)
- [ ] Analytics calculations extracted
- [ ] Contact utilities extracted
- [ ] Geo boundary data files moved
- [ ] Web app imports updated to use `@jpsrealtor/shared`
- [ ] TypeScript compiles with zero errors on both web and shared packages
- [ ] `packages/shared/package.json` with correct exports map

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Monorepo workspace structure must exist first |

| Agent | What They Need From Us |
|---|---|
| Agent 3 (Script) | Type imports for converted components |
| Agents 4-8 | All types, formatting, validation, constants, geo utils |
