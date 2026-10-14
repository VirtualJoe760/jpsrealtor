---
title: SEO — canonicals, sitemaps, structured data
status: current
last_verified: 2026-10-14
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

## 2026-10-14 — the thin-content pass

An external audit (`~/Downloads/jpsrealtor-seo-todo.md`) found that the
statewide expansion was shaped like scaled thin content. The 2026-10-11 work
fixed DECLARATION (the sitemap reached 33K URLs); this pass fixes what those
URLs actually contain, and stops declaring the ones that contain nothing.

### Metadata inherited from a layout — the biggest single defect

`app/neighborhoods/layout.tsx` exported a static `Metadata` block titled
"Coachella Valley Neighborhoods", with a CV description, a CV keyword list and
`city-images/la-quinta.jpg`. **Next.js metadata merges field by field**, and
every route beneath set only `title`/`description`/`alternates` — so ~1,600
statewide pages served a correct `<title>` next to `og:title` "Coachella Valley
Neighborhoods", a photo of La Quinta, and keywords naming CV cities. Riverside
included. Those are the tags social platforms and Google's preview read, so
every page in the tree announced itself as the same hub page.

- The layout exports NO metadata now, and carries a comment saying why not.
- Place pages build complete og/twitter blocks via `buildPlaceMetadata()` in
  `lib/seo-metadata.ts`, where og:title is derived from the title and cannot
  drift from it.
- `keywords` is gone sitewide (removed from the root layout, and set to `null`
  by `buildPlaceMetadata` so an ancestor cannot reintroduce it).
- og:image is a generated per-place card, `/api/og/place`. There is no
  photographic alternative: `cities.photo` is empty for all 1,047 rows,
  `public/city-images/` does not exist in this deployment, and the only
  per-city imagery available is MLS photography owned by other brokerages.
  **It needed its own `PUBLIC_API_EXACT` entry in `proxy.ts`** — `/api/og` is
  an exact match, not a prefix, so the new route 401'd on first request. An
  og:image that 401s is an og:image that does not exist.

### Computed market data (`lib/market-stats.ts`)

Per-city content was four numbers off the `cities` document. It is now medians,
$/sqft, DOM, sale-to-list, months of supply, YoY, inventory by type and price
band, recent sold comps, and 3–4 sentences assembled from those numbers — all
server-rendered (`components/seo/MarketStatsBlock`), because Googlebot's JS
pass is a second visit a low-authority page may wait weeks for.

Three traps are documented at length in that file and are repeated here because
each one produced a visible defect:

1. **`cities.listingCount` counts EVERY property type.** Indio's "818 active"
   was 487 homes + 189 rentals + 66 land + 9 income. That is why the page said
   818 while its own About text said 571, and why the price range read
   "$1k – $5.9M" — the floor was a RENTAL. Never use it for a for-sale number.
2. **Active listings carry no `daysOnMarket`.** The field is indexed but
   unpopulated (0 of 486 Indio actives). Median DOM comes from closed sales.
3. **There is no historical inventory snapshot.** `californiastats` holds one
   document. "Inventory is up 18% YoY" is not computable here, only invented —
   year-over-year is median close price and sales volume, both of which the
   closed collection genuinely supports.

Min/max price range is replaced by the **10th–90th percentile** everywhere: one
bad row is all min/max needs.

### The indexability gate (`lib/indexability.ts`)

One decision function for robots meta AND sitemap inclusion, because a URL
declared in the sitemap that serves `noindex` teaches Google the sitemap is
unreliable for every other URL in it.

| | threshold |
|---|---|
| City | ≥15 active residential, ≥24 closed in 12 months, stats block renderable |
| Subdivision | (≥3 active OR ≥10 closed) AND (curated facts OR ≥25 combined) |

The closed-sales floor is **24, not the audit's "12 months of closed sales"**:
the audit also required Mountain Center (21 active, 18 closed) to come back
noindex, and those two do not agree. 24 satisfies the acceptance case and has
its own justification — a median needs ~2 sales/month to stop swinging on single
transactions. Note "12 months of closed sales" cannot mean 12 DISTINCT months
either: the closed feed runs ~2 months behind, so even Riverside covers only 10.

Measured: **186 of 223** routable SoCal cities and **122 of 1,034** SoCal
subdivisions index. `Non-HOA {City}` buckets are excluded by an explicit rule
(`isPlaceholderSubdivision`), not by the name-join accident that was already
excluding them — 132 thin pages would have become indexable the day someone
taught that aggregation to resolve them.

Everything that fails stays live and `follow`. It just stops asking to rank.

### Sitemap index

`app/sitemap.ts` (the `MetadataRoute.Sitemap` convention) is **gone** for agent
hosts, replaced by `app/sitemap.xml/route.ts` (index) +
`app/sitemap/[slug]/route.ts` (children), fed by `lib/sitemap-sources.ts`. One
invocation could not do three things the audit required:

- **Per-URL `lastmod`.** Every entry used to carry `new Date()` — the build
  time. Google learns to ignore a lastmod that always equals fetch time. City
  lastmod is now `max(freshest listing change in the city, cities.lastUpdated)`,
  subdivisions the same, listings their own `modificationTimestamp`, articles
  `articles.updatedAt` from **Mongo** (the old generator read MDX frontmatter
  `date`, i.e. the PUBLISH date, so an edited article never signalled a change).
  Measured: 186 city URLs carry 109 distinct lastmod values.
- **More than ~12,000 listing URLs.** That cap was wall clock, not spec; one
  invocation reading all active SoCal listings takes ~52s and returned
  504 FUNCTION_INVOCATION_TIMEOUT.

  **Listings are partitioned BY COUNTY, and the first attempt at this was
  wrong.** It split by page number using `skip: (page - 1) * 10_000` with a
  `modificationTimestamp` sort, and shipped — listings-2/3/4 returned 504 in
  production while listings-1 worked. Two compounding causes:
  `skip` is O(n) in MongoDB (page 4 walks and discards 30,000 rows first), and
  the sort was NOT index-covered because the filter also constrains
  `countyOrParish` and `slugAddress`, so the planner either scanned the sort
  index row by row or sorted in memory. Measured: the page-2 query took
  **55,082ms** behind a 60s limit.

  County partitioning rides `idx_county_status`, needs no skip and no sort, and
  is STABLE — a URL never migrates between children as inventory shifts, which
  a page-number split does on every crawl. Worst child is Los Angeles at
  15,728 URLs / ~12s. Measured after the fix: all 8 counties 200, totalling
  **39,401 listing URLs** against 9,981 under the broken split.

  The index route is also DB-free now (the county list is static). It was
  calling `countDocuments` over the whole filter, which made the single
  document Googlebot fetches most often an 18.6s request; it is now 0.27s.
- **Dropping `changefreq` / `priority`.** Google ignores both, and priority was
  serialising as `0.49999999999999994`.

**Cross-collection parallelism is a win here, unlike the per-county case.** The
note in `sitemap-generator.ts` about parallelism being slower (70.9s vs 52s)
applies to concurrent cursors on ONE collection contending for I/O. The gate's
two aggregations hit different collections: cities 33s → 22s, subdivisions
49s → 22s. Each child route gets its own 60s budget.

`generatePlatformSitemap()` still serves chatrealty.io's ~6 pages.

### ~460 per-place buy/sell pages removed

`/neighborhoods/{city}/buy` and `/sell` (×~230 cities, plus a pair per
subdivision) had, as their only city-specific content, the `<title>`, the meta
description and one CTA heading. "Why Work With Joseph", the five-step journey
and the agent bio were byte-identical between buy and sell AND across every
city. They also competed with the city page that linked to them.

They 301 (308) to `/neighborhoods/{city}#buy|#sell`, where the forms now render
as sections; the generic case is stated once at the new `/buy` and `/sell`.
`/selling` — a declared sitemap URL whose component rendered the literal string
`"page"` in a div — 301s to `/sell`.

The legacy `/subdivisions/[slug]{,/buy,/sell}` shims were **already dead**:
they read `params.slug` synchronously, and `params` is a Promise in Next 16, so
every one of them fell through to "not found" and dumped visitors on
`/neighborhoods`. Awaited now, and pointed straight at the final destination so
they do not chain.

### Copy and compliance

- **FAQ answered from the data.** It was identical on every city, and the
  visible block (4 hardcoded Q&As in `CityPageClient`) did not match the
  FAQPage schema (5 different ones from `getCityFaqs`) — structured data that
  is not on the page is a rich-results violation. Both now render from one
  server-built array.
- **Region is a variable.** `cities.region` already held the right answer
  ("Inland Empire & Desert" for Riverside); the templates asserted "Coachella
  Valley" regardless.
- **The generated city copy is no longer rendered.**
  `src/data/city-content-generated.json` opened with a verbatim Wikipedia
  paragraph (the file still carries the `wikiExtract` field it was lifted from)
  and baked a stale listing count into prose — the source of Riverside's "571"
  against a live 709. Hand-curated CV `about` text is kept. **Original copy for
  the top non-CV markets is still open and is a content task, not a code one.**
- **"Over 30 years of experience in the Coachella Valley"** (the fallback bio in
  `useAgentProfile`, rendered on ~460 pages) was a licensing claim the bio could
  not support — the 1970s date is the FAMILY business and the 30 years is
  residency. Reworded; "Years Experience: 30+" became "Years in the Valley".
- **`ServiceAreaNote`** renders on pages outside the declared service areas and
  states how those markets are actually served, instead of claiming local
  expertise in ~224 cities.
- **Global footer** (`components/SiteFooter`). The old one began
  `if (pathname !== '/') return null`, so ~100,000 pages had no footer and the
  site never named the responsible broker anywhere. Resolved from the domain
  owner — nothing is hardcoded, because one deployment serves many agents.

### robots.txt

**A crawler obeys exactly one group.** Once `User-agent: Googlebot` exists,
Googlebot stops reading `*` entirely — so `/private/`, `/test/`,
`/*/property-stats`, `/404`, `/500` and the Spark `/v1/` paths, which lived only
under `*`, were invisible to the one crawler that matters. Every group now
repeats the full list; the duplication is the protocol working. `Host:` is gone
(Yandex-only, deprecated 2018). `/_next/` stays allowed for everyone.

### Monitoring

- `lib/indexnow.ts` + `POST /api/seo/indexnow` push changed URLs to Bing and
  Yandex. Google does not participate in IndexNow and its Indexing API covers
  only JobPosting/BroadcastEvent, so for Google the levers remain `lastmod` and
  internal links.

  **Live as of 2026-10-14.** Key generated, `public/<key>.txt` committed (it is
  PUBLIC by design — the engines fetch it to verify ownership), and
  `INDEXNOW_KEY` set in all three Vercel environments. `publishArticle()` pings
  on every article publish, resolving the AUTHOR's own domain — submitting
  every article to jpsrealtor.com would ask Bing to index one agent's URL for
  another agent's content. The ping is wrapped so it can never fail a publish.

  **Listing changes are not wired yet** and are the remaining integration. Do
  NOT bolt it into the MLS sync scripts casually — see AGENTS.md rule 2 on what
  happened last time a sync script was edited in passing. The low-risk path is
  a daily cron that POSTs the most recently modified `slugAddress` values to
  `/api/seo/indexnow`; the route already accepts a batch and authenticates with
  `CRON_SECRET`.
- `.github/workflows/lighthouse-seo.yml` + `lighthouserc.json`: SEO ≥ 0.95,
  with `canonical`, `meta-description` and `crawlable-anchors` as hard
  assertions — the three that were genuinely broken. It audits PRODUCTION, not
  a CI build, because every page here is rendered from MongoDB and building in
  CI would mean putting live credentials in GitHub secrets (AGENTS.md rule 9).
  So it is a regression alarm, not a gate; the gate stays `tsc` + `next build`.
  The workflow also validates the sitemap index and greps Riverside's meta tags
  for "coachella".

### Staged rollout (`SEO_ROLLOUT_REGIONS`)

The audit asked for out-of-area cities to be released "in batches of 20–30,
starting with the highest-priority regions", checking after each batch whether
>30% land in "Crawled – currently not indexed". 186 city pages appearing at
once off a domain with a 7% index rate is the shape of a content farm, and a
template problem is cheaper to learn about on 20 pages than on 186.

Batching is BY REGION, because that is the audit's own phrasing and because
`cities.region` is already on the document each page fetches — so it costs no
extra query and the page and the sitemap cannot disagree about who is live.

```
SEO_ROLLOUT_REGIONS="Coachella Valley"                          # phase 1
SEO_ROLLOUT_REGIONS="Coachella Valley,Inland Empire & Desert"   # phase 2
unset  or  "*"                                                  # all released
```

**The default is everything-released, deliberately.** Staging means choosing to
withhold ~150 city pages from the index, which is a traffic decision, not a
code one. The mechanism is defaulted off so the decision is one environment
variable rather than a deploy. Verified 2026-10-14: with the var set to
"Coachella Valley", Indio/Palm Desert/La Quinta return `index, follow` and
Riverside/Los Angeles/Irvine return `noindex, follow`; unset, Riverside
returns `index, follow`.

Subdivisions follow their city's region and are never released ahead of it —
publishing a community page whose parent city says noindex would orphan it.

### Still open after this pass

- **Resubmit the sitemap index in GSC and Bing** — only meaningful after
  deploy, and GSC resubmission needs a browser consent carrying
  `auth/webmasters` (see the Pending section below).
- **IndexNow on listing changes** — see the note under Monitoring.
- **Original local copy for the top ~20 non-CV markets.** Content, not code.
- **A street address for the `RealEstateAgent` node.** None is stored, and
  inventing a place of business is a checkable claim.
- **`carlos@obsidianregroup.com` still names eXp Realty** in their own
  brokerage fields. That is a different agent's identity, not part of Joey's
  rebrand — flagged, deliberately untouched.
- The in-process sitemap cache is per-lambda; a cold start pays the full ~22s.
  A precomputed gate collection would fix it if it ever becomes a problem.

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
