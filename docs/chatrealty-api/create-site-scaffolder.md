---
title: create-chatrealty-site (frontend scaffolder)
last_verified: 2026-08-05
owner: platform
status: shipped — PUBLISHED to npm; current create-chatrealty-site@0.16.0 (2026-08-06)
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

**v0.16.0 (2026-08-06) — the license number stops vanishing, and "caught up"
stops lying.** Session-13 judge run (Diana Marsh, GPS MLS).

*`AGENT_LICENSE` silently truncated at `#`.* `.env` treats `#` as a comment
start, so the guide's own `AGENT_LICENSE=CA DRE #02241837` stored `CA DRE ` and
the footer rendered "CA DRE" with no digits — no error, no warning. California's
standard license format always contains `#`, so this was the normal case, and a
missing license number is an IDX **compliance** failure, not a cosmetic one.
`env.example` and the CLI's generated block now ship the value quoted, with the
reason spelled out; the build guide tells the builder to read the rendered footer
and confirm the digits are on the page.

*`/api/sync/cron?status=1` reported "caught up" for three different states* —
seed finished, seed never started, and seed died before committing a watermark.
A session read `{"seeding":false,"progress":"caught up"}` off a database that had
never completed a pass and concluded the data step was done. Only a committed
watermark is "caught up" now; the other two say so, and the response carries a
`started` boolean.

**v0.14.0 (2026-08-05) — `?view=map` survives the URL, and the wrong token
now says so out loud.** Session-12 judge run (Diana Marsh, GPS MLS) scored
42/100 and failed three gates, all downstream of one thing: the build ran on a
token minted for a *different* agent. Two of the four bugs it filed were already
fixed and are recorded here so the next report doesn't re-file them.

*Not reproducible — `getAgentProfile()` ignoring `AGENT_*`.* Reported as
critical: overrides applied only via a `getSiteAgent()` helper, so the homepage
showed one agent and `/contact` another. `getAgentProfile()` has applied
`applyIdentityOverrides()` since v0.11.0 (commit `142ec4f6`), and `getSiteAgent`
exists nowhere in this repo — the tester's site had a hand-written wrapper of
its own from an earlier session. DESIGN.md now states plainly that
`getAgentProfile()` is the **one** identity function and applies the overrides
itself, so nobody adds a second one.

*The real defect the split identity was hiding: the overrides can't save you
from the wrong token.* They cover the fields you set; headshot, bio, service
areas and specializations stay the token holder's, and **leads land in the token
holder's CRM**. Nothing said so. `lib/chatrealty.ts` now logs an IDENTITY
MISMATCH warning in development when `AGENT_NAME` and the token's profile name
disagree, naming both and pointing at `whoami`; the build guide gained step
`0a` — confirm the account *before* the first build command. Verified: scaffold
with `AGENT_NAME=Diana Marsh` on a Jordan Avery profile and the warning fires.

*`?view=map` was ignored on load, and the map view could not be linked.* Real,
and the same class of bug as v0.13.0's lost search: `ListingsBrowser` seeded
`view` from a hardcoded `"grid"`, and its URL-sync effect `replaceState`'d the
address bar from `toQuery(applied)` — which had no `view` key, so arriving with
`?view=map` had the param stripped before the map could open, and toggling to
the map never wrote it back. `view` is now a parsed `initialView` prop and a
`toQuery` key. The `?back=` href deliberately stays on `grid` (the visitor
clicked a card, so that is the surface they return to). Verified in a browser:
`/listings?view=map` opens the map with the Map button active and the param
intact; toggling Grid→Map rewrites the URL both ways.

*Favicon 404 on every page.* The template shipped no icon, so browsers probed
`/favicon.ico` and logged a 404 — the only console error the session saw. Added
`app/icon.svg`; Next serves it and emits `<link rel="icon">`, so browsers stop
probing. A direct request to `/favicon.ico` still 404s (there is no `.ico`), but
nothing requests it once the link tag is present.

*Not reproducible — CHAP mounting without a key.* `ChapWidget` already returns
`null` when `GET /api/chat` reports `{enabled:false}`, which is exactly what a
missing key produces. The session looked for `GROQ_API_KEY`; the variable is
`CHAT_API_KEY` (the site is provider-agnostic — a Groq `gsk_…` key goes in
`CHAT_API_KEY`). `env.example` now says so in the place the tester was looking.

*Unresolved — the browse showed a city outside `MARKET_CITIES`.* Traced the
whole chain and every link is correct: `marketScopeCities()` reads
`MARKET_CITIES` first, the route forwards `cities`, `buildTenantListingFilter`
maps it, and `postgres-adapter` emits `city IN (…)`. Could not reproduce without
the tester's tenant DB. The two live hypotheses are both now self-diagnosing:
`lib/chatrealty.ts` logs which source the scope came from and the cities it
resolved to (with a reminder that Next reads `.env.local` only at **startup** —
the likely cause, an unrestarted dev server), and `@chatrealty/sync` now warns
when a run was capped, because the session seeded with `run --once` (500
arbitrary records, often mostly one city) and read `pulled=500` as done.

**v0.13.0 (2026-08-05) — the detail page fits a phone, and the back link
actually carries the search.** Session-9 judge run (Sandra Okafor, Cathedral
City / Desert Hot Springs) failed gate 7 on a 375px viewport. It also confirmed
the first real-data render of the loop: `RESO_BEARER_TOKEN` +
`RESO_BASE_URL` + `npx @chatrealty/sync init` put live GPS listings on a
scaffolded site, so the corrected RESO path in the guide is right.

*The detail page scrolled sideways on a phone (the gate failure).* The layout
was `grid gap-8 lg:grid-cols-3` with a `lg:col-span-2` child. The columns are
declared only at `lg:`, but the **span is not** — and CSS Grid honors a span
regardless, inventing two implicit columns and sizing them to content. The main
column measured **3,112px inside a 375px viewport**. It is now
`grid-cols-1 lg:grid-cols-3` / `col-span-1 lg:col-span-2`, plus `min-w-0` on
both children so a long word or the map can't push them wider. Verified on a
scaffolded site: document `scrollWidth` 375, main column 343px. The rule for
anything added here later: a base span goes with every breakpoint span.

*"Back to listings" lost the search — and the href was never the problem.* Fixed
in v0.12.0 by the card's account and still broken in the browser's. The card
encoded `?back=/listings?maxPrice=600000&minBeds=3` correctly; `app/listings/
page.tsx` read only `city` out of its own URL, so `ListingsBrowser` mounted with
empty filters and its URL-sync effect immediately `replaceState`'d the address
bar down to a bare `/listings`. The destination erased the search on arrival.
The page now parses all six filters (numerics stripped to digits, bed/bath
counts constrained to the values the selects offer) and seeds **both** the form
and the applied search through a new `initialFilters` prop; `initialCity` stays
for compatibility but is deprecated — city alone drops the rest. Verified as a
round trip, not by reading the DOM: filter → open a listing → click back → URL
keeps `?city=Palm+Desert&maxPrice=900000&minBeds=2`, inputs repopulate, 10
results. Inspecting an `href` cannot detect this class of bug; only the click
can.

*"View all N photos" is gone on purpose.* The judge went looking for it in the
swipe deck and filed its absence. It never lived there — it was on the detail
page, it linked to the hub's gallery, and v0.12.0 replaced it with the on-site
`<PhotoGallery />`. No code change; the v0.12.0 note below and the build guide
(step 6a-2) both described a link that no longer exists, and both now say so.

Guide changes in `@chatrealty/mcp-server` (0.20.9): 6a-2 drops the dead link and
names `PhotoGallery`; new **6a-3** (open the detail page at 375px and explain
the implicit-column trap) and **6a-4** (test the back link by clicking it and
reading the address bar, never by inspecting the href).

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
listings rendered inside a chat artifact, not for the agent's own site. **Two**
were rerouted through `listingHref()` (`lib/links.ts`) to `/listings/{key}`; the
photos button was **deleted**, not rerouted, because the
detail page ships a real on-site `<PhotoGallery />` (hero + thumbnail strip +
full-screen viewer, `getListingPhotos()` → `/api/skill/listings/{key}/photos`)
instead of a link to someone else's gallery. `detailUrl` is now documented in
`lib/types.ts` as the hub URL, not this site's. (Wording corrected in v0.13.0:
"all three now go through `listingHref()`" sent the session-9 judge hunting for
a "View all N photos" link that had been removed. A note that says *rerouted*
when the change was *removed* costs someone a bug report.)

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
