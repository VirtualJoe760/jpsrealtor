# Agent 4: Listings & Search

**Runs:** Parallel (after Agents 1-3 complete)
**Estimated Time:** 3-5 weeks

---

## Mission

Fix up and finalize all property listing and search components after the automated conversion script runs. Handle the manual review items, replace web-specific patterns, and build a polished native search + detail experience.

---

## Component Inventory (40-50 components)

### Listing Detail Components (`src/app/components/mls/`)

| Component | File | Size | Complexity | Key Challenges |
|---|---|---|---|---|
| **ListingClient.tsx** | Main detail wrapper | 49.7KB | HIGH | Massive component — theme, favorites, mortgage calc, CMA, related listings, nearby map. Break into sub-screens. |
| **CollageHero.tsx** | Photo gallery + lightbox | — | HIGH | `createPortal` for modals, keyboard nav, portrait lock via `screen.orientation`. Replace with RN modal + `react-native-image-zoom-viewer`. |
| **ListingCarousel.tsx** | Image carousel | — | MEDIUM | Uses `next/image`. Replace with `react-native-fast-image` + `FlatList` horizontal. |
| **ListingPageHero.tsx** | Hero overlay | — | LOW | Straightforward layout conversion. |
| **ListingDescription.tsx** | Description section | — | LOW | Text-only, trivial. |
| **ListingAddressBlock.tsx** | Address display | — | LOW | Text formatting. |
| **ListingAttribution.tsx** | MLS attribution | — | LOW | Icons + text. |
| **ListingBreadcrumbs.tsx** | Breadcrumbs | — | LOW | Replace `next/link` with navigation. Remove entirely for mobile — use back button instead. |
| **PropertyDetailsGrid.tsx** | Beds/baths/sqft grid | — | LOW | Simple grid → flexbox row. |
| **FactsGrid.tsx** | Additional facts | — | LOW | Key-value pairs. |
| **FeatureList.tsx** | Amenities list | — | LOW | List items. |
| **SchoolInfo.tsx** | School info | — | LOW | Data display. |
| **RelatedListings.tsx** | Related listings carousel | — | MEDIUM | Horizontal FlatList with ListingCard items. |
| **NearbyListingsMap.tsx** | Nearby map | — | MEDIUM | Small map embed — use react-native-maps. |
| **PhotoModal.tsx** | Fullscreen photos | — | MEDIUM | Replace `createPortal` with RN `Modal`. Image zoom/pinch via `react-native-image-zoom-viewer`. |

### Map Search Components (`src/app/components/mls/map/`)

These are shared with Agent 5 (Map). Agent 4 owns the listing-display parts, Agent 5 owns the map parts.

| Component | Owner | Notes |
|---|---|---|
| **MapPageClient.tsx** | Agent 5 | Map orchestrator |
| **ListingBottomPanel.tsx** | Agent 4 | 24KB, swipeable card with drag physics. Replace Framer Motion with `react-native-reanimated` + `react-native-gesture-handler`. |
| **PannelCarousel.tsx** | Agent 4 | Photo carousel in bottom panel |
| **SwipeableListingStack.tsx** | Agent 4 | Tinder-like swipe queue. Rebuild with `react-native-gesture-handler` PanGestureHandler. |
| **FavoritesPannel.tsx** | Agent 4 | 27.7KB, favorites sidebar. Convert to full screen or bottom sheet on mobile. |
| **AsidePreview.tsx** | Agent 4 | Aside panel |
| **DislikedBadge.tsx** | Agent 4 | Simple badge |
| **DislikedResetDialog.tsx** | Agent 4 | Modal dialog |
| **MortgageCalculator.tsx** | Agent 4 | Form + calculations — straightforward |
| **SwipeCompletionModal.tsx** | Agent 4 | Simple modal |
| **Fresh.tsx** | Agent 4 | Badge indicator |

### Search & Filter Components (`src/app/components/mls/map/search/`)

| Component | Complexity | Key Challenges |
|---|---|---|
| **FiltersPannel.tsx** | HIGH | Complex filter UI with collapsible sections, price range, beds/baths, sqft, amenities toggles, city/subdivision pickers, HOA filters. Convert to scrollable bottom sheet with sections. |
| **MapSearchBar.tsx** | MEDIUM | Autocomplete with API results. Replace with `TextInput` + `FlatList` dropdown. |
| **ActiveFilters.tsx** | LOW | Horizontal ScrollView of filter pills. |

### Dashboard/Favorites Components (`src/app/dashboard/components/`)

| Component | Complexity | Notes |
|---|---|---|
| **FavoriteProperties.tsx** | MEDIUM | Grid/list toggle — use FlatList with numColumns. |
| **FavoritesListView.tsx** | LOW | List variant. |
| **FavoriteCommunities.tsx** | LOW | Community list. |
| **RemovedListingsModal.tsx** | LOW | Alert modal for status changes. |

### Chat-Context Listing Components (`src/app/components/chat/`)

| Component | Owner | Notes |
|---|---|---|
| **ListingCarousel.tsx** (chat) | Agent 6 | Chat uses this — but same pattern as our carousel |
| **ListingListView.tsx** (chat) | Agent 6 | Chat list view |

### Other Listing Components

| Component | Location | Notes |
|---|---|---|
| **FeaturedListings.tsx** | `src/app/components/buy/` | Featured grid — FlatList horizontal |
| **SubdivisionListings.tsx** | `src/app/components/subdivisions/` | Subdivision listing list |
| **SubdivisionMapAndListings.tsx** | `src/app/components/subdivisions/` | Combined view |
| **ListingPhoto.tsx** | `src/app/components/` | Reusable photo component |
| **ContactPropertyCarousel.tsx** | `src/app/components/crm/` | CRM property carousel — Agent 7 |

---

## Hooks to Port

| Hook | File | Key Changes |
|---|---|---|
| **useFavorites** | `src/app/utils/map/useFavorites.ts` | Replace `localStorage` with `AsyncStorage`. Replace `sessionStorage` with in-memory cache. `fetch` works as-is. |
| **useListings** | `src/app/utils/map/useListings.ts` | `fetch` + `AbortController` — works as-is in RN. |
| **useDislikes** | `src/app/utils/map/useDislikes.ts` | Replace `localStorage` with `AsyncStorage`. |
| **useFilters** | `src/app/utils/map/useFilters.ts` | Remove URL sync (no URL params in RN). Store in state/context. |
| **useSwipeQueue** | `src/app/utils/map/useSwipeQueue.ts` | Pure logic — works as-is. |
| **useRemovedListings** | `src/app/dashboard/hooks/useRemovedListings.ts` | Replace `sessionStorage` → in-memory or AsyncStorage. |
| **useFavoritesSync** | `src/app/hooks/useFavoritesSync.ts` | Replace `sessionStorage` → AsyncStorage. |

---

## Specific Conversion Challenges

### 1. ListingClient.tsx (49.7KB — Main Detail Page)

This is the biggest component. Break it into a ScrollView with sections:

```
ListingDetailScreen
├── ScrollView
│   ├── PhotoGallery (CollageHero replacement)
│   ├── PriceAndAddress
│   ├── PropertyDetailsGrid
│   ├── FactsGrid
│   ├── FeatureList
│   ├── Description
│   ├── MortgageCalculator (collapsible)
│   ├── SchoolInfo
│   ├── NearbyMap (small, non-interactive preview)
│   ├── RelatedListings (horizontal FlatList)
│   └── Attribution
├── FloatingActionBar (sticky bottom)
│   ├── FavoriteButton
│   ├── ShareButton
│   └── ContactAgentButton
```

### 2. CollageHero.tsx (Photo Gallery)

Web uses CSS grid layout + createPortal for fullscreen modal. Replace:

- **Grid layout:** `FlatList` with `numColumns={3}` for thumbnail grid, first item spanning full width
- **Fullscreen modal:** `react-native-image-zoom-viewer` or `react-native-image-viewing`
- **Keyboard navigation:** Not applicable on mobile — use swipe gestures
- **Portrait lock:** `react-native-orientation-locker` if needed

### 3. ListingBottomPanel.tsx (24KB — Swipeable Card)

Complex drag/swipe physics with Framer Motion. Replace:

- `motion.div` → `Animated.View` from `react-native-reanimated`
- Drag gesture → `PanGestureHandler` from `react-native-gesture-handler`
- Spring animations → `withSpring()` from Reanimated
- 3D transforms → `transform: [{ perspective }, { rotateY }]` in Reanimated

### 4. SwipeableListingStack.tsx (Tinder-like Swipe)

Rebuild with:
- `PanGestureHandler` for swipe detection
- `react-native-reanimated` for card animations (rotation, translation, opacity)
- Threshold-based commit (swipe far enough = action)
- Left swipe = dislike, Right swipe = favorite

### 5. FiltersPannel.tsx (Complex Filter UI)

Convert to a bottom sheet (`@gorhom/bottom-sheet`) with:
- ScrollView containing filter sections
- Price range: dual slider component (`@react-native-community/slider` or custom)
- Beds/baths: row of buttons (1, 2, 3, 4, 5+)
- Amenities: toggle switches
- City/subdivision: searchable picker
- Boolean toggles: `Switch` components

### 6. FavoritesPannel.tsx (27.7KB — Sidebar)

On web this is a right sidebar. On mobile:
- Full screen view (accessible from Favorites tab)
- `FlatList` with `ListingCard` items
- Pull-to-refresh
- Filter bar at top (status, sort)

### 7. URL State Sync

The web app syncs filter state and map position to URL params. In RN:
- Store filter state in React Context (no URL)
- Pass params via React Navigation `route.params`
- Persist last search via AsyncStorage

---

## Navigation Integration

### Screen Definitions

```typescript
// screens/search/SearchMain.tsx
// screens/search/ListingDetail.tsx
// screens/search/FilterSheet.tsx
// screens/favorites/FavoritesList.tsx
// screens/neighborhoods/CityDetail.tsx
// screens/neighborhoods/SubdivisionDetail.tsx
```

### Deep Linking

| URL Pattern | Screen | Params |
|---|---|---|
| `jpsrealtor.com/mls-listings/[slug]` | ListingDetail | `{ slug }` |
| `jpsrealtor.com/neighborhoods/[city]` | CityDetail | `{ cityId }` |
| `jpsrealtor.com/neighborhoods/[city]/[sub]` | SubdivisionDetail | `{ cityId, slug }` |

---

## API Endpoints Used

These endpoints are already built and stay unchanged:

| Endpoint | Method | Used By |
|---|---|---|
| `/api/mls-listings` | GET | Search (bounds + filters) |
| `/api/mls-listings/[slug]` | GET | Listing detail |
| `/api/mls-listings/[slug]/photos` | GET | Photo gallery |
| `/api/mls-listings/[slug]/openhouses` | GET | Open house info |
| `/api/mls-listings/[slug]/videos` | GET | Video links |
| `/api/mls-listings/[slug]/virtualtours` | GET | Virtual tours |
| `/api/mls-listings/[slug]/documents` | GET | Documents |
| `/api/listings/featured` | GET | Featured carousel |
| `/api/listings/related` | GET | Related listings |
| `/api/user/favorites` | GET/POST | Sync favorites |
| `/api/user/favorites/[key]` | POST/DELETE | Add/remove favorite |
| `/api/user/favorites/sync-status` | POST | Status check |
| `/api/user/dislikes/[key]` | POST/DELETE | Dislike management |
| `/api/map-clusters` | POST | Clusters (shared with Agent 5) |
| `/api/search` | GET | Autocomplete |

---

## External Dependencies for This Agent

| Library | Purpose | Replaces |
|---|---|---|
| `react-native-fast-image` | Cached image loading | `next/image` |
| `react-native-image-viewing` | Fullscreen photo viewer | CollageHero modal |
| `react-native-reanimated` | Animations | Framer Motion |
| `react-native-gesture-handler` | Swipe gestures | Web drag events |
| `@gorhom/bottom-sheet` | Filter panel, details | Sidebar panels |
| `@react-native-community/slider` | Price range filter | HTML range input |

---

## Deliverables Checklist

- [ ] ListingClient.tsx broken into modular screen sections
- [ ] Photo gallery with fullscreen viewer and pinch-to-zoom
- [ ] ListingBottomPanel rebuilt with Reanimated + GestureHandler
- [ ] SwipeableListingStack (Tinder swipe) rebuilt
- [ ] FiltersPannel converted to bottom sheet with native controls
- [ ] FavoritesPannel converted to full screen list
- [ ] All hooks ported (localStorage → AsyncStorage)
- [ ] Search autocomplete working
- [ ] RelatedListings horizontal FlatList
- [ ] MortgageCalculator functional
- [ ] All navigation wired (Search → Detail → Back)
- [ ] Deep linking configured for listing URLs
- [ ] Pull-to-refresh on all list views
- [ ] Loading skeletons for all screens

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Navigation structure, base components, theme |
| Agent 2 | Shared types (MapListing, Photo, Filters), formatting utils |
| Agent 3 | Pre-converted component files + manual review report |
| Agent 5 | Map integration points (shared MapStateContext) |
