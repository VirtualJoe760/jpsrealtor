# Current Session — Resume Instructions

**Last Updated**: April 12, 2026

## What Was Built (Apr 10-12)

### Landing Pages (`/lp/`)
- Dedicated layout with `LandingPageFooter` (agent headshot, contact info, broker logo)
- `LandingPageClient` — no blog chrome, hero image, form rendering, theme override
- CMS form builder enhanced: radio, yes/no, checkbox/select with options
- Theme override (force light/dark) per landing page
- Sidebar/nav hidden on `/lp/` routes

### Agent Settings Wizard (`/agent/settings`)
- 7-step wizard: Identity, Branding, Photos, Content, Social, Domain/SEO, Service Areas
- Branding step: font family, theme mode (both/light/dark), light+dark logo variants
- Per-step save, reusable ImageUploadField
- Dashboard slimmed to read-only (settings extracted)
- Settings added to agent nav

### Subdivision CMA Components
- `GET /api/cma/subdivision/[slug]` — pre-computed stats + sales history from unified_closed_listings
- `GET /api/cma/subdivision/[slug]/narrative` — Groq AI market narrative (cached 24h)
- 9 reusable components: MarketSnapshot, MarketNarrative, ActiveVsClosed, SubTypeBreakdown, PriceMetrics, SalesTimeline, CompsTable (paginated with satellite thumbnails), QualityBadge
- All charts use shadcn ChartContainer/ChartConfig
- Integrated into subdivision pages above Buy/Sell CTA

### Subdivision Buy/Sell Pages
- Rebuilt to mirror city buy/sell pages
- Hero with listing photo slideshow from `/api/subdivisions/[slug]/listings`
- Agent branding, market snapshot, journey steps, intake CTAs
- Fixed Next.js 15 `params` Promise pattern

### Bug Fixes
- shadcn tooltip light mode: `.theme-lightgradient` now sets `--background: white`
- `/api/agent/public` now returns `brokerLogo` field
- `fetchPosts.ts` parses landing page + form fields from frontmatter
- `overflow-x-hidden` removed from landing page main content wrapper (scroll fix)

## Open Items
- City CMA system (planned — needs histogram blocks in subdivision cmaStats first)
- Agent settings: service areas / business hours UI (placeholder exists)
- Frontend IMedia PascalCase → camelCase update (for unified photo sync)
- purge-stale.py safety guard before re-enabling --purge
