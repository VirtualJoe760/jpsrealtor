---
title: Off-market listing pages
status: current
last_verified: 2026-11-02
related: [README.md, ../seo/README.md, ../../AGENTS.md]
---

# Off-market listing pages

**Built 2026-11-02.** When `/mls-listings/<slugAddress>` points at a listing
that is no longer in `unified_listings`, the page renders an off-market notice
instead of redirecting to the city page (the redirect, `d2aa74c2`, saved the
crawl but dropped the visitor on a city index with no idea which home they
wanted).

## What the page shows

`src/app/mls-listings/[slugAddress]/OffMarketListing.tsx`, top to bottom:

1. **"This home is no longer on the market."** No reason given — we don't know
   why it left (expired, withdrawn, under contract, sold, or a data gap), and
   asserting one would be a claim about another broker's listing.
2. **Contact CTA** for the site's agent (`useAgentProfile`, so an agent
   subdomain shows that agent): call + book a time.
3. **Homes for sale nearby** — `RelatedListings` (active only; subdivision
   first, city fallback), titled "Homes for sale in {subdivision|city}".
4. **About the community** — subdivision name, a two-sentence teaser of its
   description, homes for sale and median list price, and a link to
   `/neighborhoods/{city}/{subdivision}`. Only when we know the subdivision.
5. Fallback links: search all listings, explore the city (or neighborhoods).

It shows **nothing about the property itself** — no address, photos, price or
facts. See the rules below.

## Data

`resolveOffMarketContext(slug)` in `src/lib/listings/dead-listing-redirect.ts`:

| Slug found in | City from | Subdivision from |
|---|---|---|
| `unified_closed_listings` (sold) | the row's `city` | the row's `subdivisionName` → `Subdivision` (name + city, case-insensitive) |
| nowhere | the slug tail, matched to a live `cities` row (longest first) | — (unknown) |
| nowhere, no city match | — | — (generic links only) |

The location is used only to choose nearby listings and the community section.

## Why no property data — IDX rules (checked 2026-11-02)

- **NAR model IDX rules** (2022 changes): display of **expired and withdrawn**
  listings on IDX sites is prohibited; sold may be shown where sold data is
  public (California is). CRMLS follows NAR policy.
- **CRMLS (Feb 2026):** for listings in Closed/Leased, Expired or Cancelled
  status, only the **primary photo** may be displayed.
- An unmatched slug may be expired or withdrawn and we can't tell, so the page
  shows none of it. Sources: [CRMLS blog](https://blog.crmls.org/updates/safety-first-why-crmls-is-removing-most-images-of-closed-listings-from-idx-syndication/),
  [NAR 2022 MLS policy changes](https://www.nar.realtor/about-nar/policies/summary-of-2022-mls-changes).

The earlier plan in this doc (full listing page + "off market as of {date}",
via a sync that keeps off-market rows) was dropped for this reason. A
compliant richer version remains possible later: **pending/under contract**
listings may be shown in full, and **sold** listings with one photo — both need
the sync to keep those rows (backend repo).

## SEO

- **200 + `noindex, follow`** (`generateMetadata`). Noindex keeps ~22k thin URLs
  out of the index; follow passes crawl to the nearby active listings.
- Not a soft-404 risk: the page has real content (listings, community) and is
  noindexed. Watch Search Console's Soft 404 bucket anyway after deploy.
- Never add these URLs to a sitemap.
- Relisting: a plain 200 with the listing page's short revalidate, so a slug
  that comes back Active replaces the notice within minutes (the reason the
  old redirect was a 307, not a 308, for unknown slugs).

## Verified 2026-11-02 (local dev)

| Slug | Result |
|---|---|
| `37358-westridge-avenue-palm-desert-ca-92211` (sold, Sun City) | 200, noindex/follow, 6 Sun City listings, community section, `/neighborhoods/palm-desert/sun-city` → 200 |
| `99999-nowhere-lane-palm-desert-ca-92260` (unknown) | 200, noindex/follow, Palm Desert listings, "Explore Palm Desert" |
| `zzz-garbage-slug` | 200, noindex/follow, generic links |
