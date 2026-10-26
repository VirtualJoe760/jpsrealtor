---
title: Listing caching, self-fetches and bot traffic
status: current
last_verified: 2026-10-25
related: [README.md, ../routing/README.md, ../multi-tenant/README.md, ../tech-debt.md]
---

# Listing caching, self-fetches and bot traffic

Written after a Vercel usage spike (2026-10-25): about 123k function
invocations in 12 h. Three functions made up about 64% of them:
`/api/mls-listings/[slugAddress]` 30k, `/mls-listings/[slugAddress]` 29k and
`/api/listings/[listingKey]/photos` 20k. The pages and the listing API were
0% CDN-cached, and the firewall logged 89.4k requests per 24 h with
`User-Agent: node`.

## Root causes

### Confirmed in code

1. **The detail page called its own API over HTTP.**
   `src/app/mls-listings/[slugAddress]/page.tsx` fetched
   `${NEXT_PUBLIC_BASE_URL}/api/mls-listings/{slug}` and then
   `/api/listings/{key}/photos`, both with `cache: "no-store"`. One page view
   cost three function invocations plus two extra trips through the
   middleware. That is why the 29k page renders sat next to 30k API calls and
   20k photo calls.
2. **The OG image did the same, and it was broken.** `opengraph-image.tsx`
   ran on the edge runtime, so it couldn't open Mongo and fetched
   `/api/mls-listings/{slug}` instead. Every hit cost a second invocation.
   On prod that fetch failed, so every listing returned the 10,864-byte
   "Property Not Found" fallback (byte-identical to a bogus slug; checked
   2026-10-25). Two latent render bugs then surfaced on the Node runtime:
   the relative `/images/no-photo.png` (ImageResponse needs absolute URLs)
   and `{city}, {state}` as three child nodes in a non-flex div. Both are
   fixed. Page metadata sets `openGraph.images` explicitly (the primary
   photo), so this route isn't what social previews use. Its card still
   hardcodes "Joseph Sardella / jpsrealtor.com" on every host; see
   `docs/tech-debt.md`.
3. **The listing API was never cached.** The `/api/(.*)` rule in vercel.json
   sends `no-store`, and the route set no header of its own. Browser code
   requests the same slugs over and over: the map prefetch in
   `MLSProvider.tsx` (up to N concurrent), the chat cards and the
   ListingBottomPanel. Each of those requests was an invocation.
4. **Photo API empty results were never cached.** The `primaryPhotoUrl` and
   `none` responses had no cache header, so photo-less listings re-ran the
   function every time.
5. **No page HTML can be CDN-cached today.** The root layout
   (`src/app/layout.tsx`) reads the `site-theme` cookie and resolves tenant
   branding from the `Host` header (`getServerTenantConfig`). Next marks every
   page `private, no-store`, and vercel.json's page catch-all says
   `max-age=0, must-revalidate`. This is why `/terms-of-service`,
   `/privacy-policy`, `/book-appointment`, `/neighborhoods` and
   `/mls-listings` all show 0% cached. vercel.json also pins
   terms/privacy to `no-store` explicitly.

### Strong hypothesis (not proven from logs)

- **Most of the "node" traffic is our own server.** Node's built-in `fetch`
  (undici) sends `User-Agent: node` by default, and these self-fetches set no
  UA. 29k pages × 2 self-fetches ≈ 58k per 12 h, the same order as 89.4k per
  24 h. To confirm, open Vercel → Logs, filter `user-agent: node`, and check
  that the paths are `/api/mls-listings/*` and `/api/listings/*/photos`. The
  request's source IP will be a Vercel/AWS function IP. If that traffic drops
  after deploy, the hypothesis holds. Any `node` traffic left over (other
  paths, non-AWS IPs) is a real scraper and is covered by the rules below.

## What changed (2026-10-25)

| Change | File | Effect |
|---|---|---|
| Shared server reads `getEnrichedListing` / `getListingPhotos` / `getListingPhotosFromListing` | `src/lib/listings/listing-detail.ts` | One implementation for the page, OG image and API routes |
| Page reads Mongo in-process; photos come from the row it already holds (no second query) | `mls-listings/[slugAddress]/page.tsx` | **−2 invocations per page view** |
| OG image moved to the `nodejs` runtime and calls the shared reader | `opengraph-image.tsx` | −1 invocation per crawler preview |
| Listing API answers `s-maxage=600, swr=3600`; 404s get `s-maxage=60` | `api/mls-listings/[slugAddress]/route.ts` | Repeat browser requests become CDN hits |
| Photo API caches empty results for 5 min (found results stay at 1 h) | `api/listings/[listingKey]/photos/route.ts` | Photo-less listings stop re-invoking |
| Map page uses a same-origin, cacheable fetch (it was absolute `NEXT_PUBLIC_BASE_URL` + `no-store`) | `mls-listings/[slugAddress]/map/page.tsx` | Works from other tenant domains, and hits the CDN |

Expected result: listing-detail traffic falls from about 3 invocations per
view to about 1. That is roughly 50k fewer invocations per 12 h at the
observed load, before counting CDN hits on the API.

## Freshness windows and invalidation

The VPS pipeline is the only writer (see `crontab.vps`). It runs the listing
update at 06:00, status at 07:00 and photos at 09:00–09:30, once a day.

| Data | Data cache (`unstable_cache`) | CDN | Worst-case staleness after a VPS write |
|---|---|---|---|
| Listing detail (by slug or key) | 600 s, tag `listing:<slug>` | `s-maxage=600, stale-while-revalidate=3600` | ~10 min fresh, up to 70 min if served stale-while-revalidating |
| Listing not found | 600 s (`null` is cached too) | `s-maxage=60` | ~11 min before a newly synced slug resolves |
| Photos (db / spark) | 3600 s, tag `listing-photos:<key>` | `s-maxage=3600, swr=86400` (unchanged) | 1 h |
| Photos (empty) | 3600 s | `s-maxage=300` | up to ~65 min |

- **Invalidation is time-based only.** The VPS writes Mongo directly and
  never calls Next, so there is nothing to hook. The tags exist so that a
  future writer *inside* the app can call `revalidateTag(listingTag(slug))`.
  The CDN can be purged by path from the Vercel dashboard (Caching → Purge)
  or the `vercel` CLI.
- **The detail page HTML is still rendered per request** (cause 5). It is
  now cheap, because the data cache usually answers without touching Mongo.

## Tenant / domain separation

- Everything cached here is MLS data. It is the same on every host and for
  every visitor, and nothing in it reads the Host header, cookies or the
  session. A cache entry made on chatrealty.io and served on jpsrealtor.com
  holds the same bytes either way.
- The page itself is not CDN-cached, so per-host canonicals, branding, the
  theme cookie and the signed-in nav are rendered fresh per request, as they
  were before.
- **Don't add `s-maxage` to any page** while the root layout reads cookies or
  Host. Vercel's CDN keys on the path, so one host's branding or one
  visitor's theme would be served to everyone. Making pages cacheable is a
  separate project: render theme client-side only, and either vary on a
  low-cardinality tenant header set by middleware or split routes per host.
  See `docs/tech-debt.md`.

## Bots and rate limits — recommended Vercel settings (NOT applied)

Nothing below has been applied; the code change didn't touch the dashboard.
Project: Vercel `virtualjoe760` / `jpsrealtor` → **Firewall**.

1. **Bot Protection → turn on Bot Filter in "Log" mode for 48 h first, then
   "Challenge".** Bot Filter challenges non-browser traffic that isn't a
   verified bot. Verified bots (Googlebot, Bingbot, facebookexternalhit,
   Twitterbot, Slackbot, LinkedInBot) pass automatically, so search indexing
   and link previews keep working. Log mode first shows what it *would*
   block. Our own server self-fetches are gone after this deploy, so they
   can't be challenged.
2. **Custom rule: rate-limit `Meta-ExternalAgent`.** This is Meta's AI
   training crawler. It is **not** the link-preview fetcher, which is
   `facebookexternalhit`. Condition: User Agent contains `meta-externalagent`
   → Rate limit, fixed window 60 s, 30 requests per IP, action 429. (Deny
   outright if you don't want to feed Meta's AI training; it has no SEO
   value.) Never match `facebookexternalhit` or `facebot`.
3. **Custom rule: rate-limit `AhrefsBot`.** This is an SEO tool crawler with
   no search-ranking value. Condition: User Agent contains `AhrefsBot` →
   Rate limit 60 s / 20 requests per IP → 429. Alternatively, add
   `Crawl-delay` for AhrefsBot in robots (Ahrefs honors it).
4. **Custom rule: rate-limit the listing surface for everyone.** Condition:
   Path starts with `/mls-listings/` OR `/api/mls-listings/` OR
   `/api/listings/` → Rate limit 60 s / 300 requests per IP → 429. The map's
   background prefetch (`MLSProvider.tsx`) can fire dozens of
   `/api/mls-listings/*` calls a minute while a person pans, so start high,
   then tighten from the Firewall logs. It still caps any single scraper.
5. **Don't block `User-Agent: node` blindly.** Once this deploy is live,
   watch the logs for 24 h. If `node` traffic persists from non-Vercel IPs on
   listing paths, rule 4 already throttles it. Add a `node` challenge only
   once the logs show it isn't one of our own integrations (the MCP bridge,
   agent sites built with `create-chatrealty-site`, and the VPS scripts all
   call `/api/skill/*` with Node).

**Fluid Compute** is a separate lever. It reuses one function instance for
concurrent requests, which cuts GB-hours (billed duration while waiting on
Mongo). It does **not** reduce the invocation count. Turn it on under
Settings → Functions → Fluid Compute after the invocation numbers settle, so
the two effects can be told apart.

## Measuring before / after

Compare equal windows on the same weekday and the same hours. Bot traffic is
bursty, so compare 24 h against 24 h, not 12 h against 12 h:

1. **Observability → Vercel Functions**: invocations per route for
   `/mls-listings/[slugAddress]`, `/api/mls-listings/[slugAddress]` and
   `/api/listings/[listingKey]/photos`. The page's count should stay about
   the same; the two API routes should drop sharply.
2. **Observability → Edge Requests** (or the CDN tab): cache-hit % for
   `/api/mls-listings/[slugAddress]` should go from 0% to non-zero. Spot-check
   with `curl -sI https://jpsrealtor.com/api/mls-listings/<slug>` twice; the
   second response should show `x-vercel-cache: HIT`.
3. **Usage → Function Duration (GB-hours)** for the listing page and API.
4. **Firewall → Traffic, filter User Agent = `node`**: the count should
   collapse if the self-fetch hypothesis is right.
5. Normalize by page views: Web Analytics page views per day for
   `/mls-listings/*`. Bot volume swings, so invocations per page view is the
   honest metric.
