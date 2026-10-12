---
title: SEO — canonicals, sitemaps, structured data
status: current
last_verified: 2026-10-12
related: [../multi-tenant/README.md, ../routing/README.md]
---

# SEO

## TL;DR

One deployment serves three domains (jpsrealtor.com PRIMARY, josephsardella.com
supplementary, chatrealty.io platform). Every SEO URL — canonicals, sitemap
`<loc>`s, robots `Host:`/`Sitemap:`, breadcrumb JSON-LD — is built on the
**canonical host** via `getBaseUrl()` in `src/lib/domain-utils.ts`, which
applies `SUPPLEMENTARY_DOMAIN_CANONICALS` (josephsardella.com → jpsrealtor.com).
The 2026-07-25 audit + fixes are the baseline; GSC context: 165 clicks /
16.2K impressions / avg pos 14.1 over the prior 6 months.

## Gotchas (each was a live defect on 2026-07-25)

- **Never put `alternates.canonical` in the root layout.** It is inherited by
  every page without its own metadata — it stamped the bare domain root onto
  ~1,924 listing pages, telling Google the whole catalog duplicated the
  homepage. Pages own their canonicals (homepage via the server wrapper
  `src/app/page.tsx`; the client page is `HomeClient.tsx`).
- **Canonical host comes from config, not the request.** Building SEO URLs on
  the request host made josephsardella.com's 208 neighborhood pages compete
  with the primary. Use `getBaseUrlFromHeaders()` — already aliased.
- **The sitemap resolver must use the full owner chain** (customDomain
  variants + DomainRegistry ownerId), not customDomain exact-match — that
  mismatch gave the PRIMARY domain an 11-URL platform sitemap while the
  2,189-URL agent sitemap sat on the supplementary host.
  `src/lib/sitemap-generator.ts`.
- **No cross-host `<loc>` entries.** Sitemap protocol requires same-host URLs;
  Google ignored the old agent/platform cross-links.
- **Sold/inactive listings are noindexed** (kept: `robots index:false` in
  `mls-listings/[slugAddress]/page.tsx` generateMetadata).
- **JSON-LD**: `OrganizationJsonLd` resolves the domain owner and emits a real
  RealEstateAgent (name, phone, headshot, CA DRE identifier, brokerage,
  sameAs, areaServed). Listing pages emit `PropertyListingJsonLd`
  (RealEstateListing + Offer). Placeholder-shell fallback only on error.

## 2026-10-11 audit — the 7% index rate

GSC showed 3,707 indexed against 126,407 not-indexed, and 220 clicks / 21,239
impressions over 16 months. Root cause was **declaration, not quality**: the
sitemap declared 2,360 URLs out of ~100K renderable ones, because
`getScopeCities()` was limited to the agent's 6 service-area cities. A random
URL-inspection sample measured the gap exactly:

| | sampled | indexed | rate |
|---|---|---|---|
| In the sitemap | 62 | 35 | **56%** |
| Renderable, not in the sitemap | 55 | 2 | **3.6%** |

45 of those 55 came back "URL is unknown to Google" — never discovered at all,
because no page linked to them either. Fixes:

- **Sitemap scope is now the `City`/`Subdivision` collections, not a hardcoded
  city list** — Southern California (8 counties), Coachella Valley first so CV
  is never the part that gets truncated at the 50K ceiling. 2,360 → ~33,300.
- **Server-rendered link hubs** (`components/seo/CrawlableLinks` +
  `lib/crawl-index.ts`). `/neighborhoods` rendered 0 city anchors and city
  pages rendered 0 listing anchors, so the sitemap was the only discovery path.
- **Non-place subdivisions are filtered out.** "Not Applicable", "N/A",
  "Other" etc. are MLS filler; 41 of them would have become URLs. The list is
  `NON_PLACE_SUBDIVISION_NAMES` in `lib/neighborhoods-data.ts` — one source of
  truth, because the directory page filtered them and the sitemap did not.
- **14 duplicated `<loc>`s and 4 dead subdivision URLs are gone.** The old
  hardcoded subdivision constant paired neighborhoods with the wrong cities
  (`la-morada` is in Coachella, not Indio; `desert-horizons-country-club` is in
  Indian Wells, not Palm Desert), and the route resolves by
  `createSlug(subdivision.city)`, so each mismatch was a declared 404. Deriving
  the city from the subdivision record fixes it by construction: all 970 in-scope
  subdivision URLs were verified to resolve.
- **Articles got a self-canonical** (`insights/[category]/[slugId]`). They had
  none at all, and they are the highest-CTR pages on the site (1.74% vs 0.35%
  for city pages).
- **Three soft 404s in the article route became real 404s.** Missing/invalid/
  wrong-domain articles rendered an apology at HTTP 200. Note the ordering: the
  existence checks sit BEFORE the try/catch, because `notFound()` throws and the
  catch would otherwise convert it straight back into a 200.

Still open (deliberately — flagged, not fixed):

- Root layout calls `cookies()`/`headers()`, forcing full dynamic rendering and
  a sitewide `private, no-store`. `vercel.json` declares
  `public, max-age=0, must-revalidate` but is overridden at runtime.
- No compound index on `unifiedlistings` for
  `{city, standardStatus, propertyType, modificationTimestamp}`. Sorting city
  listings measured **37.7s** (Los Angeles), so `getCityListingLinks()` runs
  unsorted on purpose. Add the index and the sort can come back.
- `/mls-listings` still renders no server-side listing anchors (full-screen map
  layout); `/neighborhoods`, `/mls-listings`, `/selling`, `/contact`,
  `/book-appointment` have no self-canonical (harmless — Google self-canonicalises
  — but inconsistent).
- Pre-crawl canonical damage is still in GSC: sampled pages last crawled
  2026-04 → 2026-07 report `userCanonical: https://jpsrealtor.com/` from the old
  root-layout canonical. Live HTML is correct; it clears on recrawl.
- `Unknown`-county hygiene in `cities` (599 rows duplicating CV/Joshua Tree).

## Tracking & retargeting tags

Per-tenant measurement IDs live at `agentProfile.tracking` (User model), are
resolved server-side by `getServerTenantConfig()` in `lib/nav-layout.ts`, and
render via `components/seo/GoogleTags.tsx` (GA4 + Google Ads on one gtag.js
load) and the `pixelId` prop on `components/MetaPixel.tsx`. Env vars
(`NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_GOOGLE_ADS_ID`) remain the platform fallback, so an agent who sets
nothing keeps the previous behaviour.

- These are **public** IDs — they ship in the HTML by design. That is why they
  are agent-editable settings and not secrets.
- `enabled: false` is an explicit opt-out and must NOT fall back to the platform
  IDs; `sanitizeTracking()` handles that case separately.
- Malformed IDs are rejected rather than rendered. A bad tag loads, reports
  nothing, and looks installed.
- **GA4 cannot build Google Ads audiences on its own.** YouTube and Display
  remarketing need the `AW-` tag, which the site did not render anywhere before
  this change. `capabilities.youtubeRetargeting` on the skill endpoint reports
  this directly.
- Surfaces: `/agent/settings` → "Tracking & Ads";
  `GET|PATCH /api/skill/site/tracking` (scope `site:manage`); MCP tools
  `get_tracking` / `set_tracking`.

### Which pages fire a pixel event

A loaded pixel only yields a PageView. Retargeting audiences that segment by
intent need a per-page `ViewContent`, so these are wired explicitly:

| Page | Helper | `content_type` |
|---|---|---|
| Listing detail | `trackViewContent` | `property` |
| Subdivision (+ buy/sell) | `trackViewContent` | `property` |
| City | `trackViewCity` | `destination` |
| Insights article | `trackViewArticle` | `article` |
| Landing page | `trackViewContent` + `trackLead` | `property` |
| Favourites | `trackViewTopListings` | `product_group` |

City and article pages fired **nothing** until 2026-10-12 — the base pixel was
loading, so the tags looked healthy, but the two page types with the clearest
topic intent never entered an audience.

Cities and articles get their own helpers on purpose: `trackViewContent` stamps
`content_type: "property"` and a `listingKey`, so routing a place or an article
through it files them as homes that no product catalog can ever match.

**Known wart:** subdivision pages still report as `property` with the slug as
the `listingKey`. It works for a plain "viewed content" audience but will not
match a catalog feed. Left as-is deliberately — changing the event shape would
break any audience already built on it. Revisit when a catalog is connected.

## Pending (dashboard/user actions, not code)

- Vercel: chatrealty.io→www and www.josephsardella.com→apex are 307; switch to
  permanent (jpsrealtor's www→apex 308 is the model).
- GSC: verify sc-domain:josephsardella.com (no property exists), then
  URL-inspect listing pages post-deploy.
- jpsrealtor.com sitemap resubmitted 2026-10-12T08:09Z (`isPending: true`,
  warnings 3 → 0 — the 3 warnings were the 14 duplicate `<loc>` entries).
  Resubmission needs an ADC grant carrying `auth/webmasters`, NOT
  `webmasters.readonly`, and gcloud's `print-access-token --scopes` allowlist
  excludes webmasters — so it takes a browser consent and cannot run
  unattended. `PUT .../sitemaps/{feedpath}` returning 204 is the whole API;
  "Request Indexing" is UI-only and the Indexing API covers only
  JobPosting/BroadcastEvent.
- Planned endgame: host-level 301 josephsardella.com → jpsrealtor.com AFTER
  the corporate-filter recategorization of jpsrealtor.com lands (see
  multi-tenant README, "Special domains").
