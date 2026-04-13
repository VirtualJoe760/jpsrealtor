# Implementation Checklist

Step-by-step checklist to get Meta Pixel and Google Ads fully operational.

---

## Phase 1: Activate Meta Pixel (Quick Win)

- [ ] Create Meta Pixel in [Events Manager](https://business.facebook.com/events_manager)
- [ ] Copy Pixel ID to `.env.local` → `NEXT_PUBLIC_META_PIXEL_ID=<your-pixel-id>`
- [ ] Deploy — page views + favorites tracking go live immediately
- [ ] Install [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper) and verify events
- [ ] Check Events Manager > Test Events for incoming data

## Phase 2: Wire Meta Pixel Events to All Forms

- [ ] Add `trackLead()` to buy-intake form component (client-side, after successful API call)
- [ ] Add `trackLead()` to sell-intake form component
- [ ] Add `trackLead()` to general contact form component
- [ ] Add `trackSearch()` to property search execution
- [ ] Add `trackCompleteRegistration()` to signup success flow
- [ ] Add `trackViewContent()` to listing detail page
- [ ] Verify all events in Meta Pixel Helper / Events Manager

## Phase 3: Google Ads Setup

- [ ] Create Google Ads account at [ads.google.com](https://ads.google.com)
- [ ] Link GA4 property (`G-613BBEB2FS`) to Google Ads account
- [ ] Create conversion actions (Lead, Signup, etc.) — note Conversion ID and Labels
- [ ] Add `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX` to `.env.local`
- [ ] Update `layout.tsx` to configure Google Ads ID alongside GA4
- [ ] Create `src/lib/google-ads.ts` tracking utility
- [ ] Wire conversion events into form submission handlers
- [ ] Verify conversions in Google Ads > Tools > Conversions

## Phase 4: Audience Building

- [ ] Create Meta Custom Audience from CRM contacts (email/phone CSV upload)
- [ ] Create Meta Lookalike Audience from client list
- [ ] Create GA4 Audiences (listing viewers, lead submitters, etc.)
- [ ] Verify GA4 audiences are syncing to linked Google Ads account
- [ ] (If eligible) Create Google Ads Customer Match list

## Phase 5: Server-Side Tracking (Meta Conversions API)

- [ ] Generate Meta System User Access Token
- [ ] Create `src/lib/meta-capi.ts` server-side utility
- [ ] Add CAPI calls to `/api/leads/buy-intake`
- [ ] Add CAPI calls to `/api/leads/sell-intake`
- [ ] Add CAPI calls to `/api/contact`
- [ ] Add CAPI calls to `/api/campaign/submit`
- [ ] Verify server events in Events Manager (should show "Browser + Server" for matched events)
- [ ] Enable deduplication between browser pixel and CAPI events

## Phase 6: Google Ads Enhanced Conversions

- [ ] Enable Enhanced Conversions in Google Ads settings
- [ ] Add hashed user data (`email`, `phone`) to conversion events
- [ ] Verify enhanced conversion data in Google Ads reporting

---

## Environment Variables Summary

```env
# Already configured
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-613BBEB2FS

# Needs real value
NEXT_PUBLIC_META_PIXEL_ID=<your-meta-pixel-id>

# Needs Google Ads account
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-<your-conversion-id>

# Needs for Meta CAPI (Phase 5)
META_CAPI_ACCESS_TOKEN=<your-system-user-token>
```
