---
title: create-chatrealty-site (frontend scaffolder)
last_verified: 2026-08-05
owner: platform
status: shipped — PUBLISHED to npm; current create-chatrealty-site@0.12.0 (2026-08-05)
---

# create-chatrealty-site

The frontend on-ramp for the ChatRealty API. One command scaffolds a working
Next.js real-estate site wired to a tenant's `/api/skill/*` endpoints, which the
developer then customizes. This is the starter UI the [build plan](build_plan.md)
§8.2 deliberately left out of scope ("the customer builds their own UI; we ship
the data + build-guide") — now shipped as a `create-next-app`-style generator so
customers don't start from a blank page.

Source: `packages/create-chatrealty-site/`.

## Usage

```bash
npm create chatrealty-site@latest my-site
# or
npx create-chatrealty-site my-site
# non-interactive (CI / scripting):
npx create-chatrealty-site my-site --token crt_live_xxx --api-base http://localhost:3000
```

Inputs (prompted, or via `--token`/`--api-base` flags or `CHATREALTY_API_TOKEN`/
`CHATREALTY_API_BASE` env): target directory, API base (default
`https://www.chatrealty.io`), and the tenant API token (`crt_live_…`). The CLI
verifies the token against `GET /api/skill/me` (warns + continues on failure so a
bad token doesn't block scaffolding), copies `template/`, and writes `.env.local`
(mode 0600) with the token + base.

**v0.12.0 (2026-08-05) — the default browse is the agent's market, and every
listing link stays on the agent's site.** Session-8 judge run: identity,
neighborhood index and card attribution were all confirmed fixed, and the build
failed its market gate anyway — on the one surface nobody had scoped.

*The unfiltered browse (the gate failure).* `/listings` with no filter, and the
homepage's featured homes, served the newest listings in the **whole feed**: 22
of the first 23 homes on a Coachella Valley site were Camarillo, Oxnard, Oakland,
Los Angeles, Stockton and similar. The city filter had worked the whole time —
the *default* was wrong, and the default is what a visitor sees first. The feed
is always wider than the market (the shared dataset is statewide; a real MLS
covers its whole association), so `searchListings()` now scopes any search that
names no place to the agent's cities: `MARKET_CITIES` in `.env.local`, else
`AGENT_SERVICE_AREAS`, else the profile's service areas (`MARKET_CITIES=off`
browses everything). A search that names a city, subdivision or `near` point is
never narrowed behind the caller's back. With nothing to scope by, the site logs
a warning and `/listings` shows a **dev-only** notice — the previous behavior was
to serve the wrong market silently. New API param: `GET
/api/skill/listings/search?cities=A,B,C` (legacy Mongo path and the tenant
adapter both; `city` still wins when both are sent).

*Listing links left the site.* CHAP result cards, the swipe deck's "View
details" and the detail page's "View all N photos" all linked to
`chatrealty.io/mls-listings/{key}` — the API's `detailUrl`, which is meant for
listings rendered inside a chat artifact, not for the agent's own site. All three
now go through `listingHref()` (`lib/links.ts`) to `/listings/{key}`, and the
detail page ships a real on-site `<PhotoGallery />` (hero + thumbnail strip +
full-screen viewer, `getListingPhotos()` → `/api/skill/listings/{key}/photos`)
instead of a link to someone else's gallery. `detailUrl` is now documented in
`lib/types.ts` as the hub URL, not this site's.

Same release: **"← Back to listings" keeps the search** (the browse syncs its
filters to the URL and passes them to each card as `?back=`, validated
same-site on read); **the license number is labeled** on `/about` and `/contact`
(`license()` in `lib/format.ts` — "License #02189476", passing through a value
that already says DRE/License; bug `6a7285d1`); **CHAP answers the question it
was asked** (the prompt now routes market questions to `get_market_stats`,
forbids replaying a previous answer, and handles off-topic in one line; the last
tool round runs with `tool_choice: "none"` so a visitor gets an answer instead of
"I hit my lookup limit"); **no more 401 on every page load** —
`/api/account/oauth-bridge` returned 401 for the ordinary "nobody signed in with
Google" case and the client called it on every load, so every route logged a
console error. `/api/account/me` now reports `oauthPending` and the client only
bridges when there is something to bridge. Platform-side, `/api/skill/market/
stats` derives `medianDaysOnMarket` from `onMarketDate` (the DB doesn't populate
`daysOnMarket`, so every neighborhood page rendered "Median days on market: —").

**v0.11.0 (2026-08-04) — the site shows the right agent, and the neighborhood
index is about the agent instead of the feed.** Three findings from the session-7
judge run, two of them structural rather than build mistakes.

*Identity.* Every surface hydrated from `GET /api/skill/me/profile`, which is
correct for the token's owner and wrong for anyone else. A build done for a
persona shipped the token holder's name in the `<title>`, the header, `/about`
and the "Meet {name}" CTA — and the builder's `agent.name || "Their Name"`
fallbacks never fired, because the API returned a real name, just not the right
one. There was no override path at all, so the identity gate was structurally
unpassable on a shared token. `getAgentProfile()` now applies per-field
`AGENT_*` overrides from `.env.local` — `AGENT_NAME`, `AGENT_LICENSE`,
`AGENT_BROKERAGE`, `AGENT_PHONE`, `AGENT_EMAIL`, `AGENT_HEADLINE`,
`AGENT_TAGLINE`, `AGENT_BIO`, `AGENT_HEADSHOT`, `AGENT_SERVICE_AREAS`,
`AGENT_SPECIALIZATIONS` — in live, test-data and fetch-failed modes alike; unset
vars change nothing. The CLI writes the block commented into `.env.local`,
prefilled from `--agent-name` / `--brokerage` / `--market`. Second use, equally
real: a license number collected during the interview shows on the site
immediately instead of waiting on a profile edit. `set_site_live` still checks
the license on the **profile**, so an override alone does not unblock go-live —
`env.example`, `DESIGN.md` and the build guide all say so.

*Neighborhoods index.* It built its city list from `searchListings({limit: 50})`
and collected whatever cities appeared. That reads fine on a small feed and
fails on a large one: a build serving the Coachella Valley got an index of Los
Angeles, Oxnard, San Diego and Camarillo, because the agent's own markets were
not in the first 50 rows. Detail pages were correct throughout — only the index
was wrong. The index now starts from the agent's **service areas** (profile or
`AGENT_SERVICE_AREAS`), asks `/api/skill/market/stats` for each (fan-out capped
at 12), and renders a market with no active inventory honestly rather than
dropping it. Sample-derivation remains only as the fallback when no service
areas are set.

*IDX attribution on cards.* Not a template bug: `GET /api/skill/listings/search`
returned no `listAgentName` / `listOfficeName` on the legacy/dogfood path, so
`<Attribution />` correctly rendered nothing on every card while the detail page
showed it. Fixed in the API (`src/app/api/skill/listings/search/route.ts` —
projection + response); 84,979 of 84,980 active listings carry the fields, so
cards populate immediately. The tenant-adapter path already carried them in its
DTO. `lib/types.ts` and `Attribution.tsx` no longer describe attribution as
token-dependent.

**v0.10.0 (2026-08-04) — `--radius` stops being a decoy, named markets stop
being dead ends.** `DESIGN.md` advertised `--radius` as *the* shape knob, but
every surface in the template shaped itself with a hardcoded Tailwind class
(`rounded-xl`, `rounded-2xl`), which ignores the token entirely. A judged build
set `--radius: 0` for an architectural look and shipped sharp everywhere except
the listing-detail hero, the spec box, the inquiry sidebar and the CHAP result
cards — the knob moved nothing on the surfaces nobody had hand-edited. Fixed at
the source: `template/tailwind.config.ts` now maps the whole `borderRadius`
scale onto `calc(var(--radius) * n)`, with ratios chosen so the default token
(`0.75rem`) reproduces stock Tailwind to the pixel — so `rounded-*` anywhere,
including code a builder writes later, follows the token. `rounded-full` stays
`9999px` (circles are shape, not theme) and `rounded-none` is the escape hatch.
Leaflet's own hardcoded control/popup radii are overridden too, at
`.leaflet-container.leaflet-container` specificity — leaflet.css is imported
inside `ListingMap.tsx` and lands after `globals.css`, so a single-class
override ties and loses, which is exactly what the first attempt did.

Same release: `/neighborhoods` now honors `?q=`. The judged build linked its
homepage tiles ("Balboa Peninsula → Explore") at `/neighborhoods?q=…` and the
index silently discarded the param, landing every named market on the same
undifferentiated page. The index filters on `q`, and when nothing in the feed
matches the name it says so plainly and still shows the full index rather than
rendering empty. `DESIGN.md` and the build guide now state the rule: link a
named market to `/neighborhoods/<slug>`; the `q` filter is the safety net, not
the destination.

**v0.9.0 (2026-08-04) — one CHAP presentation, enforced in code.** Choosing a
CHAP presentation used to be a deletion ("mount one, delete the others"), and
the widget shipped pre-mounted in `app/layout.tsx` — so choosing anything else
meant remembering to go remove it. A judged test build put `<HeroSearch />` in
the hero (which routes to `/search`, the full-page presentation) and left the
widget mounted: one site, two live CHAP front doors. The choice is now a single
constant, `CHAP_PRESENTATION` in `template/lib/chap-presentation.ts`
(`"widget" | "panel" | "search"`). Presentations that are not the choice render
nothing, `/search` `notFound()`s unless it *is* the choice, and `<HeroSearch />`
refuses to render without a `/search` to hand off to (dev-only console warning
explains why). `<ChapWidget />` now stays in the layout under every choice.
Same release fixes the scaffolder writing `persona.serviceAreas = [market]` —
a bare string against a `{ name, type? }[]` type, which rendered an **empty**
chip on `/about`, logged a React duplicate-key warning, and silently dropped the
market name from the homepage CTA. The CLI now writes the object form, and
`getAgentProfile()` — the one door every consumer comes through — normalizes
both shapes and drops nameless entries.

**v0.3.0 (2026-07-23) — the flagship release:** **CHAP on-site** (floating chat
widget + `/api/chat` tool loop; BYOK OpenAI-compatible, Groq default; tools call
the site's own data layer so it works in test AND real modes; listing cards with
attribution; hides until `CHAT_API_KEY` set). **Rich test data**: 47 listings
anonymized from live Palm Desert-area Actives (5 cities, 44 real subdivisions,
real geo, fictional streets/agents, scrubbed remarks) + real photos with a
burned-in "SAMPLE DATA — NOT ACCURATE" watermark. **Agent hydration**: metadata,
header, footer, About, Contact, homepage all pull `/api/skill/me/profile`
(bundled sample agent in test mode); `public/logo.png|svg` auto-wires the
header. **Blog shipped** (`/blog` + posts from published CMS articles; sample
posts in test mode) — the CMS→site loop is closed. **Neighborhoods index**
derived from live data; homepage rebuilt as a sectioned neutral canvas for the
guide's design step.

**TEST DATA mode (v0.2.0, 2026-07-23):** `--test-data` (or Enter at the token
prompt) scaffolds with **zero token, zero network** against 25 fictitious sample
listings bundled in `template/data/test-listings.json` (fake cities in empty
Mojave desert, `public/test-photos/*.svg` placeholder art, "Demo Realty — Test
Data" attribution, remarks that self-identify as fictitious).
`lib/chatrealty.ts` branches on `CHATREALTY_TEST_DATA=true` into
`lib/test-data.ts` (in-memory filter/paginate/stats; lead submit no-ops); a
permanent `<TestDataBanner>` marks every page. Purpose: the BYOD preview path —
see the site working while the data-key/VPS/tenant setup is in progress
(ship-strategy Phase P + build-guide step 1). **Never launched publicly on test
data** — the guide, the CLI output, the env file, and the banner all say so.

## What the CLI is

`packages/create-chatrealty-site/src/cli.ts` — a **zero-dependency** Node CLI
(matches the `install-skill` conventions: readline prompts, `fetch`-based verify,
`tsc` build to `dist/`, CommonJS). It recursively copies `template/`, renaming the
dotfile stand-ins `gitignore`→`.gitignore` and `env.example`→`.env.example` (npm
strips some dotfiles from published tarballs). A single shared readline interface
is reused for all prompts so piped/non-interactive stdin works.

## What the template ships (full build-guide scope)

A Next.js 15 App Router site (`template/`) covering the whole build guide:

- **Listings search** — `ListingsBrowser` (client) with filters (city, price, beds,
  baths, pool), grid/map toggle, and Load-more, fetching the app's own
  `/api/listings` proxy.
- **Interactive map** — Leaflet price-pin markers with popups. `dynamic(…,
  {ssr:false})` lives in a client wrapper (`ListingMapClient`) so server pages can
  render it; Leaflet CSS is imported in the map component, not `globals.css`.
- **Listing detail** — server page (`getListing`) with full facts, remarks, a map,
  the inquiry form, and **IDX attribution** on every view ("Listed by {office} —
  {agent}"). The attribution rule is honored on cards, popups, and detail.
- **Favorites** — `useFavorites` (localStorage, custom-event sync) mirroring the
  platform's guest model.
- **Lead capture** — `/api/lead` proxy → `POST /api/skill/contacts/from-signup`,
  with a honeypot field + in-memory rate limit.
- **Neighborhoods** — server page combining `getMarketStats` + `searchListings`.

## Security model

The tenant token is **server-side only**: read from `CHATREALTY_API_TOKEN` (no
`NEXT_PUBLIC_` prefix, so Next never bundles it), used exclusively by
`lib/chatrealty.ts` (the typed server client), and every browser-facing call goes
through the app's own `/api/*` route handlers. Client components never import the
server client or see the token. `.env.local` is git-ignored by the generated
`.gitignore`.

## Verification (v0.1)

Both the CLI and the emitted template are proven:

- CLI compiles (`tsc`), scaffolds 28 files, renames dotfiles, writes `.env.local`,
  exercises the token-verify path (401 → warn → continue).
- Template `tsc --noEmit` is clean and `next build` succeeds — 6/6 pages, correct
  static/dynamic split (home + favorites static; listings/detail/neighborhoods
  server-rendered on demand).

## Relationship to the other packages

- [`packages/chatrealty-sync`](build_plan.md) — customer MLS→Postgres CLI (the
  backend bookend).
- `packages/install-skill` / `packages/mcp-server` — connect the tool catalog to a
  Claude client. The docs-site `<ClaudePrompt>` "scaffold a listings page" step
  (build plan §8.4) can point at this generator instead of hand-built snippets.

## Not yet done

- ~~Not published to npm~~ **Published 2026-07-10**: `create-chatrealty-site@0.1.0`
  live on the registry, verified end-to-end via `npx create-chatrealty-site@latest`.
  npm account `jsardella`; org `chatrealty` reserved for `@chatrealty/*` libs.
  Republish = bump version + `npm publish` (needs the bypass-2FA granular token).
- Endpoints consumed match the current `/api/skill/*` shapes; if those routes move
  to the productized OData surface (build plan Spec 6), update `lib/chatrealty.ts`.
- v0.2 direction per [ship-strategy.md](ship-strategy.md): template becomes a thin
  shell importing `@chatrealty/ui` + `@chatrealty/auth` (three-layer update model).
