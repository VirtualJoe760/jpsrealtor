---
title: Contact and closed-sale property photos
status: partial
last_verified: 2026-10-18
related: [README.md, ../listings/README.md, dialer/implementation-status.md]
---

# Property photo lookup

Contacts and sold-property dialogs share `src/lib/property-photo-service.ts` and the contact-owned `/api/crm/contacts/[id]/property-images` endpoint. GET reads exact MLS/cache matches. POST discovers photos and persists successful address-matched results. A POST listingKey selects a closed listing after verifying contact ownership. Arbitrary photo URLs cannot be submitted for seeding.

## Discovery and limitations

Exact MLS searches have a 1.5-second budget per collection; a query timeout falls through to web discovery instead of failing the whole lookup. The previous route did not crawl Zillow/Redfin/Realtor. It used loose street regexes, unrelated neighborhood photos, and a Street View URL containing a server key. The new route removes those fallbacks and noisy address logs. It verifies street (including unit), city, state and supplied ZIP before accepting MLS or web images. Next Image optimization is bypassed for these external URLs so missing host configuration cannot break display.

No paid provider or search credential is required. Ordinary Google web requests and Bing RSS are best-effort page discovery. Only HTTPS Zillow, Redfin and Realtor property pages are crawled. JSON-LD address/image pairs or page-level address-matched Open Graph metadata may yield photos; random page images and search thumbnails are never accepted as the subject home. Image HEAD requests verify an image response before persistence. Public photo CDN hosts are allowlisted. Redirects remain within source hosts; requests have byte/time limits, including a 40-second crawl deadline. There are no proxies, anti-bot bypasses or CAPTCHA solving.

Live testing found Redfin blocking automated access. Free discovery can also return no usable property links. The UI reports this and accepts a direct property-page URL, which is subject to the same source access and address checks. A direct link cannot overcome a source block. Reliable automatic coverage remains limited by public source access; no claim of universal photo recovery is made.

## Storage

`PropertyPhotoCache` has a unique normalized address key, photo URL/source/source-page/caption/order/discovery timestamps, negative-result message/retry time, and a token-owned 120-second lease. Successful URLs persist and are reused without another crawl. Empty/blocked attempts cool down for one hour; an explicit new source link may retry. A lease prevents concurrent crawling for an address. The service ensures the unique addressKey index before lookup; index creation failure is surfaced rather than allowing duplicate unprotected crawls.

Hot-reloaded models explicitly add the photo schema path when needed. Contact and UnifiedClosedListing schemas declare `externalPhotos` before writes. Successful web matches are seeded into that field with provenance, never into native MLS media or primaryPhotoUrl. Target identity is rechecked and included in the update to prevent an address-edit race. Contact address edits clear its externalPhotos along with coordinates. Negative results never erase successful cached photos. URLs are cached, not image binaries or licenses; source attribution remains visible.

## Validation

Offline tests cover address/unit mismatch rejection, URL/redirect boundaries, source metadata extraction, cache reuse, negative cooldown, schema persistence, ownership filters and target-address races. Live lookup tested a real Redfin URL and correctly reported its access block. Browser checks do not fabricate or seed placeholder property images. Tests use mocked persistence rather than changing real client records.
