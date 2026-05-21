# Tracking Strategy: Meta Pixel + Google Ads

> Full audit of every trackable action on jpsrealtor.com with implementation plan for both Meta Pixel and Google Ads conversion tracking.

---

## Current State

| Tracking | Status |
|---|---|
| Meta Pixel PageView | Active — auto-fires on every route change via `MetaPixel.tsx` |
| Meta Pixel AddToWishlist | Active — fires when user favorites a listing in `useSwipeQueue.ts` |
| GA4 PageView | Active — auto-fires via gtag in `layout.tsx` |
| Meta CAPI (server-side) | Token working, no events wired yet |
| Google Ads | Not set up |
| Everything else below | **NOT TRACKED** |

---

## Tracking Events by Priority

### TIER 1: High-Value Conversions (Lead Capture)

These are form submissions that create contacts/leads. Fire BOTH Meta Pixel (browser) + CAPI (server) + Google Ads conversion.

| # | Event | Page/Component | API Route | Data Available | Meta Pixel Event | Google Ads Event |
|---|---|---|---|---|---|---|
| 1 | **Buy Lead Intake** | `src/app/components/buy/BuyIntakeCTA.tsx` | `POST /api/leads/buy-intake` | name, email, phone, budget, beds, baths, property type, timeframe, city/subdivision | `Lead` | `submit_lead_form` |
| 2 | **Sell Lead Intake** | `src/app/components/sell/SellIntakeCTA.tsx` | `POST /api/leads/sell-intake` | name, email, phone, property address, beds, baths, sqft, condition, timeframe, expected price | `Lead` | `submit_lead_form` |
| 3 | ~~**Contact Form**~~ | ~~`src/app/components/contact/Contact.tsx`~~ | ~~`POST /api/contact`~~ | — | — | — | **DEPRECATED — skip** |
| 4 | **Campaign/Landing Page Form** | `src/app/lp/[slug]/LandingPageClient.tsx` | `POST /api/campaign/submit` | form fields, campaign slug, lead source | `Lead` | `submit_lead_form` |
| 5 | ~~**Open House Signup**~~ | ~~`src/app/open-house-signup/page.tsx`~~ | ~~`POST /api/contact`~~ | — | — | — | **DEPRECATED — skip** |
| 6 | **Appointment Booking** | `src/app/book-appointment/page.tsx` | TidyCal (external) | appointment time, type | `Schedule` | `book_appointment` |

**Implementation approach:**
- **Browser side**: Call `trackLead()` / `trackEvent('Schedule')` in the form component after successful API response
- **Server side**: Call Meta CAPI from the API route with hashed email/phone for better match quality
- **Google Ads**: Call `gtag('event', 'conversion', { send_to: 'AW-XXX/label' })` alongside the pixel event

---

### TIER 2: High-Intent Actions

These indicate strong buying/selling interest. Fire Meta Pixel (browser) + Google Ads event.

| # | Event | Page/Component | Data Available | Meta Pixel Event | Google Ads Event |
|---|---|---|---|---|---|
| 7 | **View Property Detail** | `src/app/components/mls/ListingClient.tsx` | listingKey, address, price, beds, baths, city, subdivision | `ViewContent` | `view_item` |
| 8 | **User Registration** | `src/app/auth/signup/page.tsx` | name, email, phone, location, real estate goals | `CompleteRegistration` | `sign_up` |
| 9 | **Click-to-Call** | Multiple components (see list below) | phone number, page context | `Contact` | `click_to_call` |
| 10 | **Click-to-Email** | Multiple components (see list below) | email, page context | `Contact` | `click_to_email` |
| 11 | **SMS/Text Opt-In** | `src/app/text-opt-in/page.tsx` | email, phone, consent type | `Lead` | `submit_lead_form` |
| 12 | **Marketing Consent** | `src/app/contact/page.tsx` (consent section) | email, phone, SMS/newsletter consent | `Lead` | `submit_lead_form` |

**Click-to-Call locations** (add onClick tracking to all):
- `src/app/book-appointment/page.tsx` — `tel:760-833-6334`
- `src/app/components/buy/BuyIntakeCTA.tsx` — dynamic agent phone
- `src/app/components/sell/SellIntakeCTA.tsx` — dynamic agent phone
- `src/app/components/contact/ContactInfo.tsx` — `tel:+1-760-833-6334`
- `src/app/components/EnhancedSidebar.tsx` — `tel:760-833-6334`
- `src/app/components/mls/ListingClient.tsx` — `tel:7603333676`
- `src/app/lp/LandingPageFooter.tsx` — dynamic

**Click-to-Email locations**:
- `src/app/components/contact/ContactInfo.tsx` — `mailto:josephsardella@gmail.com`
- `src/app/components/EnhancedSidebar.tsx` — `mailto:josephsardella@gmail.com`
- `src/app/book-appointment/page.tsx` — `mailto:josephsardella@gmail.com`
- `src/app/lp/LandingPageFooter.tsx` — dynamic

---

### TIER 3: Engagement & Intent Signals

These help build retargeting audiences. Fire Meta Pixel (browser) + GA4 custom event.

| # | Event | Page/Component | Data Available | Meta Pixel Event | GA4 Event |
|---|---|---|---|---|---|
| 13 | **Property Search** | `src/app/components/insights/AISearchBar.tsx` | search query, result count | `Search` | `search` |
| 14 | **Chat Search Query** | `src/app/components/chat/ChatWidget.tsx` | chat query, listings returned | `Search` | `search` |
| 15 | **View Neighborhood/City** | `src/app/neighborhoods/[cityId]/page.tsx` | cityId, city name | `ViewContent` (category: neighborhood) | `view_item` |
| 16 | **View Subdivision** | `src/app/neighborhoods/[cityId]/[slug]/page.tsx` | subdivision slug, city | `ViewContent` (category: subdivision) | `view_item` |
| 17 | **View Buy Guide** | `src/app/neighborhoods/[cityId]/buy/page.tsx` | cityId | `ViewContent` (category: buy_guide) | `view_item` |
| 18 | **View Sell Guide** | `src/app/neighborhoods/[cityId]/sell/page.tsx` | cityId | `ViewContent` (category: sell_guide) | `view_item` |
| 19 | **Read Article** | `src/app/insights/[category]/[slugId]/page.tsx` | article slug, category | `ViewContent` (category: article) | `view_item` |
| 20 | **View Landing Page** | `src/app/lp/[slug]/page.tsx` | campaign slug | `ViewContent` (category: landing_page) | `view_item` |
| 21 | **Favorite Property** | `src/app/utils/map/useSwipeQueue.ts` | listing details | `AddToWishlist` | `add_to_wishlist` |
| 22 | **View Favorites Collection** | Favorites panel in CHAP | listing IDs, total value | `ViewContent` (category: favorites) | `view_item_list` |
| 23 | **Share Property** | `src/app/components/mls/ListingClient.tsx` | listing key, address | Custom: `ShareProperty` | `share` |
| 24 | **View School District** | `src/app/neighborhoods/[cityId]/school-district/[district]/page.tsx` | district, city | `FindLocation` | `view_item` |

---

### TIER 4: Low-Priority / Nice-to-Have

| # | Event | Description | Meta Pixel Event | GA4 Event |
|---|---|---|---|---|
| 25 | **Social Media Click** | Instagram, Facebook, YouTube links | Custom: `ClickSocial` | `click` (outbound) |
| 26 | **Map Interaction** | Zoom, pan, filter on map pages | Custom: `MapInteraction` | `select_content` |
| 27 | **Filter Change** | Property search filter updates | Custom: `FilterUpdate` | `select_content` |
| 28 | **Neighborhood Expansion** | Expanding region/county/city in directory | Custom: `ExploreNeighborhood` | `select_content` |
| 29 | **Article AI Search** | Search within insights page | `Search` | `search` |
| 30 | **Video Play** | YouTube embeds in articles/landing pages | Custom: `VideoPlay` | `video_start` |
| 31 | **Dislike Property** | Swipe left in CHAP | Custom: `RemoveFromWishlist` | `remove_from_cart` |

---

## Page-Level Tracking Matrix

Every public page and what events should fire on it:

| Route | Auto PageView | Additional Events |
|---|---|---|
| `/` | Yes | — |
| `/about` | Yes | — |
| `/contact` | Yes | #3 Lead (form submit), #9 Click-to-Call, #10 Click-to-Email, #12 Marketing Consent |
| `/selling` | Yes | — |
| `/book-appointment` | Yes | #6 Schedule (TidyCal), #9 Click-to-Call, #10 Click-to-Email |
| `/mls-listings` | Yes | #13 Search (filter/search) |
| `/mls-listings/[slugAddress]` | Yes | #7 ViewContent (on load), #21 Favorite, #23 Share, #9 Click-to-Call |
| `/chap` | Yes | #14 Search (chat query), #21 Favorite, #31 Dislike, #26 Map Interaction |
| `/neighborhoods` | Yes | #28 Neighborhood Expansion |
| `/neighborhoods/[cityId]` | Yes | #15 ViewContent (neighborhood) |
| `/neighborhoods/[cityId]/buy` | Yes | #17 ViewContent (buy guide), #1 Buy Lead Intake |
| `/neighborhoods/[cityId]/sell` | Yes | #18 ViewContent (sell guide), #2 Sell Lead Intake |
| `/neighborhoods/[cityId]/[slug]` | Yes | #16 ViewContent (subdivision) |
| `/neighborhoods/[cityId]/[slug]/buy` | Yes | #17 ViewContent (buy guide), #1 Buy Lead Intake |
| `/neighborhoods/[cityId]/[slug]/sell` | Yes | #18 ViewContent (sell guide), #2 Sell Lead Intake |
| `/neighborhoods/[cityId]/school-district/[district]` | Yes | #24 FindLocation |
| `/insights` | Yes | #29 Search (AI search bar) |
| `/insights/[category]/[slugId]` | Yes | #19 ViewContent (article), #30 Video Play |
| `/lp/[slug]` | Yes | #20 ViewContent (landing page), #4 Lead (form) |
| `/campaign/[slug]` | Yes | #20 ViewContent (landing page), #4 Lead (form) |
| `/open-house-signup` | Yes | #5 Lead (form submit) |
| `/text-opt-in` | Yes | #11 Lead (SMS opt-in) |
| `/auth/signup` | Yes | #8 CompleteRegistration (on success) |

---

## Server-Side CAPI Events

These events should ALSO fire from API routes using the Conversions API for better match quality (bypasses ad blockers, sends hashed PII):

| API Route | Event | User Data to Hash & Send |
|---|---|---|
| `POST /api/leads/buy-intake` | `Lead` | email, phone, firstName, lastName, city, state, zip |
| `POST /api/leads/sell-intake` | `Lead` | email, phone, firstName, lastName, city, state, zip |
| `POST /api/campaign/submit` | `Lead` | email, phone, firstName, lastName |
| `POST /api/auth/register` | `CompleteRegistration` | email, phone, firstName, lastName |
| `POST /api/consent` | `Subscribe` | email, phone |

---

## Audience Segments to Build

Once tracking is active, these audiences build automatically:

### Meta Custom Audiences (Pixel-Based)
| Audience | Rule | Use For |
|---|---|---|
| All Visitors (30d) | Any PageView | Broad retargeting |
| Property Viewers | ViewContent where category=property | Listing ads |
| Buy Intent | Visited /buy pages OR submitted buy intake | Buyer-focused ads |
| Sell Intent | Visited /sell pages OR submitted sell intake | Seller-focused ads (CMA, listing presentation) |
| High Intent | Viewed 5+ listings OR favorited 2+ | Hot leads retargeting |
| Lead Submitters | Lead event fired | Exclude from lead gen, use for nurture |
| Registered Users | CompleteRegistration | Exclude from signup campaigns |
| Article Readers | ViewContent where category=article | Content retargeting |
| Landing Page Visitors | ViewContent where category=landing_page | Campaign-specific retargeting |

### Google Ads Audiences (GA4-Based)
Same segments via GA4 audience definitions, auto-synced to Google Ads via the GA4 link.

---

## Files That Need Changes

### New files to create:
| File | Purpose |
|---|---|
| `src/lib/google-ads.ts` | Google Ads conversion tracking utility (mirrors meta-pixel.ts pattern) |
| `src/lib/meta-capi.ts` | Server-side Meta Conversions API utility |
| `src/lib/tracking.ts` | Unified tracking wrapper that fires both Meta + Google events |

### Existing files to modify (add tracking calls):

**Forms (Tier 1 — Lead events):**
| File | Add |
|---|---|
| `src/app/components/buy/BuyIntakeCTA.tsx` | `trackLead()` + `gtagConversion()` after successful submit |
| `src/app/components/sell/SellIntakeCTA.tsx` | `trackLead()` + `gtagConversion()` after successful submit |
| `src/app/lp/[slug]/LandingPageClient.tsx` | `trackLead()` + `gtagConversion()` after successful submit |
| `src/app/text-opt-in/page.tsx` | `trackLead()` + `gtagConversion()` after successful submit |

**API Routes (Tier 1 — Server-side CAPI):**
| File | Add |
|---|---|
| `src/app/api/leads/buy-intake/route.ts` | CAPI `Lead` event with hashed user data |
| `src/app/api/leads/sell-intake/route.ts` | CAPI `Lead` event with hashed user data |
| `src/app/api/contact/route.ts` | CAPI `Lead` event with hashed user data |
| `src/app/api/campaign/submit/route.ts` | CAPI `Lead` event with hashed user data |
| `src/app/api/auth/register/route.ts` | CAPI `CompleteRegistration` event |

**High-Intent Pages (Tier 2 — ViewContent, Contact events):**
| File | Add |
|---|---|
| `src/app/components/mls/ListingClient.tsx` | `trackViewContent()` on mount + click-to-call/email tracking |
| `src/app/auth/signup/page.tsx` | `trackCompleteRegistration()` on success |
| All click-to-call links (6 files) | `onClick` handler firing `trackEvent('Contact')` + `gtagConversion()` |
| All click-to-email links (4 files) | `onClick` handler firing `trackEvent('Contact')` + `gtagConversion()` |

**Engagement Pages (Tier 3 — Search, ViewContent):**
| File | Add |
|---|---|
| `src/app/components/insights/AISearchBar.tsx` | `trackSearch()` on search submit |
| `src/app/components/chat/ChatWidget.tsx` | `trackSearch()` on chat query |
| `src/app/neighborhoods/[cityId]/[slug]/SubdivisionPageClient.tsx` | `trackViewContent()` on mount |
| `src/app/neighborhoods/[cityId]/buy/page.tsx` | `trackViewContent()` on mount |
| `src/app/neighborhoods/[cityId]/sell/page.tsx` | `trackViewContent()` on mount |
| `src/app/insights/[category]/[slugId]/page.tsx` | `trackViewContent()` on mount |
| `src/app/lp/[slug]/page.tsx` | `trackViewContent()` on mount |

---

## Google Ads Setup Requirements

Before wiring Google Ads events, you need:

1. **Google Ads Account** — create at ads.google.com
2. **Conversion ID** (`AW-XXXXXXXXX`) — from Tools > Conversions
3. **Conversion Labels** — one per conversion action (Lead, Signup, Call, etc.)
4. **Link GA4** (`G-613BBEB2FS`) to Google Ads for audience sharing
5. **Add env var**: `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX`

Once you have those, we create `src/lib/google-ads.ts` and wire it alongside the Meta Pixel calls.

---

## Implementation Order

1. Create `src/lib/tracking.ts` — unified wrapper
2. Create `src/lib/meta-capi.ts` — server-side CAPI utility
3. Create `src/lib/google-ads.ts` — Google Ads utility (once AW- ID available)
4. Wire Tier 1 events (6 forms + 5 API routes) — highest ROI
5. Wire Tier 2 events (ViewContent, Registration, Click-to-Call/Email)
6. Wire Tier 3 events (Search, Neighborhoods, Articles)
7. Wire Tier 4 events (nice-to-have)
8. Deploy and verify all events in Events Manager + Google Ads
