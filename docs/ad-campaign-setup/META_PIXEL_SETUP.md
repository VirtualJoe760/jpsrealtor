# Meta Pixel Setup

## What's Already Done

The Meta Pixel integration is **fully coded** — it just needs a real Pixel ID to go live.

### Existing Code

**`src/lib/meta-pixel.ts`** — Tracking utility library with these functions:

| Function | Event | Description |
|---|---|---|
| `pageView()` | `PageView` | Auto-fires on every route change |
| `trackViewContent()` | `ViewContent` | Property listing views (price, beds, baths, city, subdivision) |
| `trackAddToWishlist()` | `AddToWishlist` | User favorites a property |
| `trackLead()` | `Lead` | Contact form / appointment booking submission |
| `trackSearch()` | `Search` | Property search execution |
| `trackCompleteRegistration()` | `CompleteRegistration` | User signup completion |
| `trackViewTopListings()` | `ViewContent` (custom) | User views their favorite listings collection (retargeting) |

**`src/components/MetaPixel.tsx`** — Client component that:
- Calls `initMetaPixel()` on mount (loads `fbevents.js` from Facebook CDN)
- Tracks `pageView()` on every route change via `usePathname()`/`useSearchParams()`
- Renders a `<noscript>` fallback pixel image

**`src/app/components/ClientLayoutWrapper.tsx`** — Already renders `<MetaPixel />` site-wide.

**`src/app/utils/map/useSwipeQueue.ts`** — Already fires `trackAddToWishlist()` when users heart properties on the map.

---

## Step 1: Get Your Pixel ID

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Select your Business Account (or create one)
3. Click **Connect Data Sources** > **Web** > **Meta Pixel**
4. Name the pixel (e.g., "JPSRealtor Website")
5. Copy the **Pixel ID** — a numeric string like `123456789012345`

## Step 2: Activate the Pixel

Update `.env.local`:

```env
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

That's it. On next deploy, the pixel will:
- Load on every page
- Track all page views automatically
- Track property favorites (already wired)

## Step 3: Wire Remaining Events Into Forms

These tracking functions exist but aren't called in all the places they should be. Add calls to:

### Lead Capture Forms

In `src/app/api/leads/buy-intake/route.ts` and `sell-intake/route.ts`, the form submissions happen server-side. To fire pixel events, add client-side tracking in the form components that call these APIs:

```typescript
import { trackLead } from '@/lib/meta-pixel';

// After successful form submission:
trackLead({
  source: 'buy_intake_form', // or 'sell_intake_form'
  value: 0,
});
```

### Property Search

Fire when the user executes a property search:

```typescript
import { trackSearch } from '@/lib/meta-pixel';

trackSearch({
  searchString: 'La Quinta 3bed 2bath',
  contentCategory: 'residential',
});
```

### User Registration

Fire after successful signup:

```typescript
import { trackCompleteRegistration } from '@/lib/meta-pixel';

trackCompleteRegistration({ status: 'complete' });
```

### Property Detail Views

Fire when a user views a listing detail page:

```typescript
import { trackViewContent } from '@/lib/meta-pixel';

trackViewContent({
  listingId: listing.listingId,
  address: listing.unparsedAddress,
  price: listing.listPrice,
  bedrooms: listing.bedroomsTotal,
  bathrooms: listing.bathroomsTotalDecimal,
  city: listing.city,
  subdivision: listing.subdivisionName,
});
```

## Step 4: Verify the Pixel

1. Install the [Meta Pixel Helper Chrome Extension](https://chrome.google.com/webstore/detail/meta-pixel-helper)
2. Visit your site — the extension should show events firing
3. Check Events Manager > Test Events to confirm data is flowing

---

## Custom Audiences from Your CRM

Once the pixel is active, you can build audiences two ways:

### Website-Based Audiences (automatic via pixel)
- All website visitors (last 30/60/90 days)
- People who viewed specific listings
- People who favorited properties
- People who submitted lead forms

### CRM Contact Upload (manual)
1. Export contacts from your CRM (emails and/or phone numbers)
2. In Meta Ads Manager > Audiences > Create Custom Audience > Customer List
3. Upload the CSV — Meta matches to Facebook/Instagram profiles
4. Create **Lookalike Audiences** from these for prospecting

### Future: Meta Conversions API (Server-Side)

Browser pixels get blocked by ~30% of users (ad blockers). Meta's **Conversions API (CAPI)** sends events server-side for better match rates. This would:
- Fire from existing API routes (`/api/leads/buy-intake`, `/api/contact`, etc.)
- Use contact email/phone for identity matching
- Improve conversion tracking accuracy by 20-40%
- Require a **Meta Access Token** and **CAPI integration** (separate implementation)
