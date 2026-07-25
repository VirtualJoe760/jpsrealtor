---
title: SEO — canonicals, sitemaps, structured data
status: current
last_verified: 2026-07-25
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

## Pending (dashboard/user actions, not code)

- Vercel: chatrealty.io→www and www.josephsardella.com→apex are 307; switch to
  permanent (jpsrealtor's www→apex 308 is the model).
- GSC: verify sc-domain:josephsardella.com (no property exists), resubmit the
  jpsrealtor.com sitemap, URL-inspect listing pages post-deploy.
- Planned endgame: host-level 301 josephsardella.com → jpsrealtor.com AFTER
  the corporate-filter recategorization of jpsrealtor.com lands (see
  multi-tenant README, "Special domains").
